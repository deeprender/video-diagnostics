// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use tauri::Manager;
use serde::{Serialize, Deserialize};
use std::fs;
use serde_json::{json, Value};

#[derive(Debug, Serialize, Deserialize)]
struct Video {
    title: String,
    filename: String,
    path: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Folder {
    title: String,
    videos: Vec<Video>,
    subfolders: Vec<Folder>,
}

#[tauri::command]
fn parse_videos(path: String) -> Result<Folder, String> {
    let root = PathBuf::from(path);
    parse_folder(&root, &root)
}

#[tauri::command]
fn list_videos(path: String) -> Result<Vec<Value>, String> {
    let mut videos = Vec::new();

    fn visit_dirs(dir: &std::path::Path, videos: &mut Vec<Value>) -> std::io::Result<()> {
        if dir.is_dir() {
            for entry in fs::read_dir(dir)? {
                let entry = entry?;
                let path = entry.path();
                if path.is_dir() {
                    visit_dirs(&path, videos)?;
                } else if let Some(extension) = path.extension() {
                    if extension == "mp4" || extension == "webm" {
                        let video = serde_json::json!({
                            "title": path.file_stem().unwrap().to_str().unwrap(),
                            "filename": path.file_name().unwrap().to_str().unwrap(),
                            "path": path.to_str().unwrap(),
                        });
                        videos.push(video);
                    }
                }
            }
        }
        Ok(())
    }

    match visit_dirs(std::path::Path::new(&path), &mut videos) {
        Ok(_) => Ok(videos),
        Err(e) => Err(e.to_string()),
    }
}

fn parse_folder(dir: &PathBuf, root: &PathBuf) -> Result<Folder, String> {
    let mut folder = Folder {
        title: dir.file_name().unwrap().to_string_lossy().into_owned(),
        videos: Vec::new(),
        subfolders: Vec::new(),
    };

    for entry in std::fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.is_dir() {
            folder.subfolders.push(parse_folder(&path, root)?);
        } else if let Some(ext) = path.extension() {
            if ext == "mp4" || ext == "webm" {
                let relative_path = path.strip_prefix(root).unwrap().to_string_lossy().into_owned();
                folder.videos.push(Video {
                    title: path.file_stem().unwrap().to_string_lossy().into_owned(),
                    filename: path.file_name().unwrap().to_string_lossy().into_owned(),
                    path: relative_path,
                });
            }
        }
    }

    Ok(folder)
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![parse_videos, list_videos])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
