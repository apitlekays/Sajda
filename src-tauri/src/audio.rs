use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink};
use std::fs::File;
use std::io::BufReader;
use std::sync::{Arc, Mutex};
use tauri::State;

pub struct AudioState {
    pub _stream: OutputStream,
    pub stream_handle: OutputStreamHandle,
    pub sink: Arc<Mutex<Sink>>,
}

impl AudioState {
    pub fn try_new() -> Option<Self> {
        let (stream, stream_handle) = match OutputStream::try_default() {
            Ok(result) => result,
            Err(e) => {
                println!("Rust: Warning - No audio device available: {}", e);
                return None;
            }
        };

        let sink = match Sink::try_new(&stream_handle) {
            Ok(s) => s,
            Err(e) => {
                println!("Rust: Warning - Failed to create audio sink: {}", e);
                return None;
            }
        };

        Some(Self {
            _stream: stream,
            stream_handle,
            sink: Arc::new(Mutex::new(sink)),
        })
    }
}

unsafe impl Send for AudioState {}
unsafe impl Sync for AudioState {}

#[tauri::command]
pub async fn play_audio_file(
    _app_handle: tauri::AppHandle,
    file_path: String,
    state: State<'_, Option<AudioState>>,
) -> Result<(), String> {
    println!("Requesting to play audio: {}", file_path);

    let audio_state = state.as_ref().ok_or("No audio device available")?;

    let file = File::open(&file_path)
        .map_err(|e| format!("Failed to open file '{}': {}", file_path, e))?;
    let reader = BufReader::new(file);
    let source = Decoder::new(reader).map_err(|e| format!("Failed to decode audio: {}", e))?;

    let mut sink_guard = audio_state.sink.lock().map_err(|_| "Failed to lock audio sink")?;

    // Check if we can reuse the existing sink (is it empty/finished?)
    if sink_guard.empty() {
        println!("Sink is empty, reusing and appending source.");
        sink_guard.append(source);
        sink_guard.play();
    } else {
        println!("Sink is busy, stopping and creating a new one.");
        // Stop the old one explicitly (although dropping it might do it)
        sink_guard.stop();

        // Create a new sink from the stream handle
        let new_sink = Sink::try_new(&audio_state.stream_handle)
            .map_err(|e| format!("Failed to create sink: {}", e))?;
        new_sink.append(source);

        // Replace the old sink in the Mutex
        *sink_guard = new_sink;
    }

    println!("Audio playback started.");
    Ok(())
}

#[tauri::command]
pub fn stop_audio(state: State<'_, Option<AudioState>>) -> Result<(), String> {
    let audio_state = state.as_ref().ok_or("No audio device available")?;
    let sink = audio_state.sink.lock().map_err(|_| "Failed to lock audio sink")?;
    sink.stop();
    Ok(())
}
