// YouTube Video Annotation Tool - Main Script

// Global state
let state = {
    videoId: null,
    videoTitle: null,
    videoDuration: 0,
    shots: [],
    selectionStart: 0,
    selectionEnd: 0,
    currentAnswerCount: 2,
    savedAnnotations: []
};

// DOM Elements
const elements = {
    // Video Input Section
    youtubeUrl: document.getElementById('youtube-url'),
    downloadBtn: document.getElementById('download-btn'),
    downloadStatus: document.getElementById('download-status'),
    
    // Video Player Section
    videoPlayerSection: document.getElementById('video-player-section'),
    videoTitle: document.getElementById('video-title'),
    videoPlayer: document.getElementById('video-player'),
    timeline: document.getElementById('timeline'),
    progressBar: document.getElementById('progress-bar'),
    shotMarkers: document.getElementById('shot-markers'),
    selectionStart: document.getElementById('selection-start'),
    selectionEnd: document.getElementById('selection-end'),
    currentTime: document.getElementById('current-time'),
    duration: document.getElementById('duration'),
    
    // Timeline Controls
    playPauseBtn: document.getElementById('play-pause-btn'),
    setStartBtn: document.getElementById('set-start-btn'),
    setEndBtn: document.getElementById('set-end-btn'),
    previewSelectionBtn: document.getElementById('preview-selection-btn'),
    detectShotsBtn: document.getElementById('detect-shots-btn'),
    
    // Annotation Section
    annotationSection: document.getElementById('annotation-section'),
    questionText: document.getElementById('question-text'),
    answersContainer: document.getElementById('answers-container'),
    addAnswerBtn: document.getElementById('add-answer-btn'),
    saveAnnotationBtn: document.getElementById('save-annotation-btn'),
    saveStatus: document.getElementById('save-status'),
    
    // Saved Annotations Section
    savedAnnotationsSection: document.getElementById('saved-annotations-section'),
    annotationsList: document.getElementById('annotations-list')
};

// Initialize the application
function init() {
    // Set up event listeners
    elements.downloadBtn.addEventListener('click', downloadVideo);
    elements.videoPlayer.addEventListener('timeupdate', updateVideoProgress);
    elements.videoPlayer.addEventListener('loadedmetadata', initializeVideo);
    elements.timeline.addEventListener('click', seekVideo);
    elements.playPauseBtn.addEventListener('click', togglePlayPause);
    elements.setStartBtn.addEventListener('click', setSelectionStart);
    elements.setEndBtn.addEventListener('click', setSelectionEnd);
    elements.previewSelectionBtn.addEventListener('click', previewSelection);
    elements.detectShotsBtn.addEventListener('click', detectShots);
    elements.addAnswerBtn.addEventListener('click', addAnswerOption);
    elements.saveAnnotationBtn.addEventListener('click', saveAnnotation);
    
    // Setup drag functionality for timeline markers
    setupDragMarkers();
    
    // Set up event delegation for removing answer options
    elements.answersContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-answer-btn')) {
            removeAnswerOption(e.target.dataset.id);
        }
    });
}

// Download the YouTube video
async function downloadVideo() {
    const url = elements.youtubeUrl.value.trim();
    if (!url) {
        showStatus(elements.downloadStatus, 'Please enter a YouTube URL', 'status-error');
        return;
    }
    
    // Validate URL (simple validation)
    if (!url.includes('youtube.com/') && !url.includes('youtu.be/')) {
        showStatus(elements.downloadStatus, 'Please enter a valid YouTube URL', 'status-error');
        return;
    }
    
    showStatus(elements.downloadStatus, 'Downloading video... This may take a while.', 'status-warning');
    elements.downloadBtn.disabled = true;
    
    try {
        const response = await fetch('/api/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to download video');
        }
        
        // Update state with video info
        state.videoId = data.video_id;
        state.videoTitle = data.video_title;
        
        // Update UI
        elements.videoTitle.textContent = data.video_title;
        elements.videoPlayer.src = data.video_path;
        
        // Show the video player section
        elements.videoPlayerSection.classList.remove('hidden');
        elements.annotationSection.classList.remove('hidden');
        
        showStatus(elements.downloadStatus, 'Video downloaded successfully!', 'status-success');
        
        // Load saved annotations for this video
        loadAnnotations(data.video_id);
        
    } catch (error) {
        console.error('Error:', error);
        showStatus(elements.downloadStatus, `Error: ${error.message}`, 'status-error');
    } finally {
        elements.downloadBtn.disabled = false;
    }
}

// Initialize video player after metadata is loaded
function initializeVideo() {
    state.videoDuration = elements.videoPlayer.duration;
    elements.duration.textContent = formatTime(state.videoDuration);
    
    // Initialize selection end to video duration
    state.selectionEnd = state.videoDuration;
    updateTimelineMarkers();
}

// Update video progress bar
function updateVideoProgress() {
    const currentTime = elements.videoPlayer.currentTime;
    const duration = elements.videoPlayer.duration;
    
    // Update progress bar
    const progressPercent = (currentTime / duration) * 100;
    elements.progressBar.style.width = `${progressPercent}%`;
    
    // Update current time display
    elements.currentTime.textContent = formatTime(currentTime);
}

// Seek video on timeline click
function seekVideo(e) {
    const rect = elements.timeline.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const seekTime = clickPosition * state.videoDuration;
    
    elements.videoPlayer.currentTime = seekTime;
}

// Toggle play/pause
function togglePlayPause() {
    if (elements.videoPlayer.paused) {
        elements.videoPlayer.play();
        elements.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
        elements.videoPlayer.pause();
        elements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
}

// Set selection start time
function setSelectionStart() {
    state.selectionStart = elements.videoPlayer.currentTime;
    
    // Ensure start time is before end time
    if (state.selectionStart > state.selectionEnd) {
        state.selectionEnd = state.videoDuration;
    }
    
    updateTimelineMarkers();
}

// Set selection end time
function setSelectionEnd() {
    state.selectionEnd = elements.videoPlayer.currentTime;
    
    // Ensure end time is after start time
    if (state.selectionEnd < state.selectionStart) {
        state.selectionStart = 0;
    }
    
    updateTimelineMarkers();
}

// Update timeline marker positions
function updateTimelineMarkers() {
    const startPercent = (state.selectionStart / state.videoDuration) * 100;
    const endPercent = (state.selectionEnd / state.videoDuration) * 100;
    
    elements.selectionStart.style.left = `${startPercent}%`;
    elements.selectionEnd.style.left = `${endPercent}%`;
}

// Preview the selected segment
function previewSelection() {
    // Set video time to selection start
    elements.videoPlayer.currentTime = state.selectionStart;
    
    // Play the video
    elements.videoPlayer.play();
    elements.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    
    // Set up an event listener to pause when reaching the end of the selection
    const pauseAtEnd = () => {
        if (elements.videoPlayer.currentTime >= state.selectionEnd) {
            elements.videoPlayer.pause();
            elements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            elements.videoPlayer.removeEventListener('timeupdate', pauseAtEnd);
        }
    };
    
    elements.videoPlayer.addEventListener('timeupdate', pauseAtEnd);
}

// Detect shot boundaries in the video
async function detectShots() {
    if (!state.videoId) return;
    
    elements.detectShotsBtn.disabled = true;
    elements.detectShotsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Detecting...';
    
    try {
        const response = await fetch('/api/detect_shots', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ video_id: state.videoId })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Shot detection failed');
        }
        
        // Update state with shot boundaries
        state.shots = data.shots;
        
        // Display shots on timeline
        renderShotMarkers();
        
        elements.detectShotsBtn.innerHTML = '<i class="fas fa-check"></i> Shots Detected';
        
    } catch (error) {
        console.error('Error detecting shots:', error);
        elements.detectShotsBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Detection Failed';
    } finally {
        // Re-enable the button after a delay
        setTimeout(() => {
            elements.detectShotsBtn.disabled = false;
            elements.detectShotsBtn.innerHTML = '<i class="fas fa-film"></i> Detect Shots';
        }, 3000);
    }
}

// Render shot markers on the timeline
function renderShotMarkers() {
    // Clear existing markers
    elements.shotMarkers.innerHTML = '';

    // Add a marker for each shot boundary
    state.shots.forEach(shot => {
        const time = typeof shot === 'number' ? shot : shot.start;
        if (typeof time !== 'number') return;

        const percent = (time / state.videoDuration) * 100;
        const marker = document.createElement('div');
        marker.className = 'shot-marker';
        marker.style.left = `${percent}%`;
        marker.title = `Shot boundary at ${formatTime(time)}`;
        elements.shotMarkers.appendChild(marker);
    });
}

// Add a new answer option to the form
function addAnswerOption() {
    const id = state.currentAnswerCount;
    const answerContainer = document.querySelector('.answer-options');
    
    const div = document.createElement('div');
    div.className = 'answer-option';
    div.innerHTML = `
        <input type="radio" name="correct-answer" id="correct-${id}" value="${id}">
        <input type="text" id="answer-${id}" placeholder="Answer choice ${id + 1}">
        <button class="remove-answer-btn" data-id="${id}">✕</button>
    `;
    
    answerContainer.appendChild(div);
    state.currentAnswerCount++;
}

// Remove an answer option
function removeAnswerOption(id) {
    // Make sure we always have at least 2 answer options
    if (document.querySelectorAll('.answer-option').length <= 2) {
        return;
    }
    
    // Remove the answer option from the DOM
    const element = document.querySelector(`.answer-option input[id="answer-${id}"]`).parentNode;
    element.remove();
}

// Save the current annotation
async function saveAnnotation() {
    // Validate inputs
    if (!validateAnnotationForm()) {
        return;
    }
    
    // Get correct answer index
    const correctAnswerRadio = document.querySelector('input[name="correct-answer"]:checked');
    if (!correctAnswerRadio) {
        showStatus(elements.saveStatus, 'Please select the correct answer', 'status-error');
        return;
    }
    
    // Get all answer choices
    const answerChoices = [];
    document.querySelectorAll('.answer-option input[type="text"]').forEach(input => {
        answerChoices.push(input.value.trim());
    });
    
    // Prepare annotation data
    const annotationData = {
        video_id: state.videoId,
        start_time: state.selectionStart,
        stop_time: state.selectionEnd,
        question: elements.questionText.value.trim(),
        answer_choices: answerChoices,
        correct_answer: parseInt(correctAnswerRadio.value)
    };
    
    // Disable save button while saving
    elements.saveAnnotationBtn.disabled = true;
    elements.saveAnnotationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    try {
        const response = await fetch('/api/save_annotation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(annotationData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to save annotation');
        }
        
        // Show success message
        showStatus(elements.saveStatus, 'Annotation saved successfully!', 'status-success');
        
        // Clear the form
        resetAnnotationForm();
        
        // Refresh the annotations list
        loadAnnotations(state.videoId);
        
    } catch (error) {
        console.error('Error saving annotation:', error);
        showStatus(elements.saveStatus, `Error: ${error.message}`, 'status-error');
    } finally {
        // Re-enable the save button
        elements.saveAnnotationBtn.disabled = false;
        elements.saveAnnotationBtn.innerHTML = '<i class="fas fa-save"></i> Save Annotation';
    }
}

// Validate the annotation form
function validateAnnotationForm() {
    // Check if question is filled
    if (!elements.questionText.value.trim()) {
        showStatus(elements.saveStatus, 'Please enter a question', 'status-error');
        return false;
    }
    
    // Check if all answer choices are filled
    const emptyAnswers = Array.from(document.querySelectorAll('.answer-option input[type="text"]'))
        .some(input => !input.value.trim());
    
    if (emptyAnswers) {
        showStatus(elements.saveStatus, 'Please fill all answer choices', 'status-error');
        return false;
    }
    
    // Check if a correct answer is selected
    if (!document.querySelector('input[name="correct-answer"]:checked')) {
        showStatus(elements.saveStatus, 'Please select the correct answer', 'status-error');
        return false;
    }
    
    // Check if a valid selection is made
    if (state.selectionStart >= state.selectionEnd || 
        state.selectionEnd - state.selectionStart < 1) {
        showStatus(elements.saveStatus, 'Please select a valid video segment (at least 1 second)', 'status-error');
        return false;
    }
    
    return true;
}

// Reset the annotation form
function resetAnnotationForm() {
    elements.questionText.value = '';
    
    // Reset to 2 answer choices
    const answerOptions = document.querySelector('.answer-options');
    answerOptions.innerHTML = `
        <div class="answer-option">
            <input type="radio" name="correct-answer" id="correct-0" value="0">
            <input type="text" id="answer-0" placeholder="Answer choice 1">
            <button class="remove-answer-btn" data-id="0">✕</button>
        </div>
        <div class="answer-option">
            <input type="radio" name="correct-answer" id="correct-1" value="1">
            <input type="text" id="answer-1" placeholder="Answer choice 2">
            <button class="remove-answer-btn" data-id="1">✕</button>
        </div>
    `;
    
    state.currentAnswerCount = 2;
}

// Load annotations for the current video
async function loadAnnotations(videoId) {
    try {
        const response = await fetch(`/api/get_annotations?video_id=${videoId}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to load annotations');
        }
        
        state.savedAnnotations = data.annotations;
        
        // Display the annotations
        renderAnnotationsList();
        
        // Show the saved annotations section if there are annotations
        if (state.savedAnnotations.length > 0) {
            elements.savedAnnotationsSection.classList.remove('hidden');
        }
        
    } catch (error) {
        console.error('Error loading annotations:', error);
    }
}

// Render the list of saved annotations
function renderAnnotationsList() {
    elements.annotationsList.innerHTML = '';
    
    if (state.savedAnnotations.length === 0) {
        elements.annotationsList.innerHTML = '<p>No annotations saved yet.</p>';
        return;
    }
    
    state.savedAnnotations.forEach((annotation, index) => {
        const div = document.createElement('div');
        div.className = 'annotation-item';
        div.innerHTML = `
            <h3>Question ${index + 1}</h3>
            <p>${annotation.question_text}</p>
            <p><small>Time: ${formatTime(annotation.question_start_time)} - ${formatTime(annotation.question_stop_time)}</small></p>
            <button class="secondary-btn play-annotation" data-index="${index}">
                <i class="fas fa-play"></i> Play Segment
            </button>
        `;
        
        div.querySelector('.play-annotation').addEventListener('click', () => {
            playAnnotationSegment(annotation);
        });
        
        elements.annotationsList.appendChild(div);
    });
}

// Play a specific annotation segment
function playAnnotationSegment(annotation) {
    elements.videoPlayer.currentTime = parseFloat(annotation.question_start_time);
    elements.videoPlayer.play();
    
    // Set up event to pause at the end of the segment
    const pauseAtEnd = () => {
        if (elements.videoPlayer.currentTime >= parseFloat(annotation.question_stop_time)) {
            elements.videoPlayer.pause();
            elements.videoPlayer.removeEventListener('timeupdate', pauseAtEnd);
        }
    };
    
    elements.videoPlayer.addEventListener('timeupdate', pauseAtEnd);
}

// Setup drag functionality for timeline markers
function setupDragMarkers() {
    let isDragging = false;
    let currentMarker = null;
    
    // Mouse down on marker to start dragging
    elements.selectionStart.addEventListener('mousedown', startDrag);
    elements.selectionEnd.addEventListener('mousedown', startDrag);
    
    // Mouse move to update position
    document.addEventListener('mousemove', (e) => {
        if (!isDragging || !currentMarker) return;
        
        const rect = elements.timeline.getBoundingClientRect();
        let position = (e.clientX - rect.left) / rect.width;
        
        // Clamp position between 0 and 1
        position = Math.max(0, Math.min(1, position));
        
        // Convert to time
        const time = position * state.videoDuration;
        
        // Update the appropriate marker
        if (currentMarker === elements.selectionStart) {
            state.selectionStart = Math.min(time, state.selectionEnd - 0.1);
        } else {
            state.selectionEnd = Math.max(time, state.selectionStart + 0.1);
        }
        
        updateTimelineMarkers();
    });
    
    // Mouse up to stop dragging
    document.addEventListener('mouseup', () => {
        isDragging = false;
        currentMarker = null;
    });
    
    function startDrag(e) {
        isDragging = true;
        currentMarker = e.target;
        e.preventDefault(); // Prevent text selection
    }
}

// Show a status message
function showStatus(element, message, className = '') {
    element.textContent = message;
    element.className = 'status-message ' + className;
    
    // Clear status after 5 seconds
    setTimeout(() => {
        element.textContent = '';
        element.className = 'status-message';
    }, 5000);
}

// Format time in seconds to MM:SS format
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
