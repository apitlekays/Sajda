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
    pub fn new() -> Self {
        let (stream, stream_handle) =
            OutputStream::try_default().expect("failed to get default audio output");
        let sink = Sink::try_new(&stream_handle).expect("failed to create audio sink");

        Self {
            _stream: stream,
            stream_handle,
            sink: Arc::new(Mutex::new(sink)),
        }
    }
}

unsafe impl Send for AudioState {}
unsafe impl Sync for AudioState {}

#[tauri::command]
pub async fn play_audio_file(
    _app_handle: tauri::AppHandle,
    file_path: String,
    state: State<'_, AudioState>,
) -> Result<(), String> {
    println!("Requesting to play audio: {}", file_path);

    let file = File::open(&file_path)
        .map_err(|e| format!("Failed to open file '{}': {}", file_path, e))?;
    let reader = BufReader::new(file);
    let source = Decoder::new(reader).map_err(|e| format!("Failed to decode audio: {}", e))?;

    let mut sink_guard = state.sink.lock().map_err(|_| "Failed to lock audio sink")?;

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
        let new_sink = Sink::try_new(&state.stream_handle)
            .map_err(|e| format!("Failed to create sink: {}", e))?;
        new_sink.append(source);

        // Replace the old sink in the Mutex
        *sink_guard = new_sink;
    }

    println!("Audio playback started.");
    Ok(())
}

#[tauri::command]
pub fn stop_audio(state: State<'_, AudioState>) -> Result<(), String> {
    let sink = state.sink.lock().map_err(|_| "Failed to lock audio sink")?;
    sink.stop();
    // Ideally we might also want to "clear" it or ensure it's ready for next time,
    // but stopping is sufficient to silence it.
    // If we want to verify it's empty next time, stop() usually doesn't clear the queue in all versions?
    // Actually in rodio, stop() might just pause or clear.
    // A replacement strategy in play_audio_file handles the "busy" case anyway.
    Ok(())
}
