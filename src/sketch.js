const DEFAULTSTYLE = {
    fill: 0,
    background: 255,
    textStrokeWeight: 2,
    textStrokeColor: [255,255,255]
    
}

const COLORS = {
    RED: [255, 0, 0, 255],
    GREEN: [0, 255, 0, 255],
    WHITE: [255, 255, 255, 255],
    INVISIBLE: [0, 0, 0, 0]
}

const KEYCODES = {
        ARROW_LEFT: 37,
        ARROW_RIGHT: 39            
}

const SYMBOL_INPUT_MAP = {
    "←": KEYCODES.ARROW_LEFT,
    "→": KEYCODES.ARROW_RIGHT
}

//global object containing references to systems involved in running experiments
const SYSTEMS = {
    experimentManager: null,
    displayManager: null,
    inputManager: null,
    timer: null,
    validityManager: null,
    mediaCaptureManager: null
}

/*
Maintains the unique, global source of event timing truth. No other event timing/interval systems should be used.
*/
class Timer {
    intervals = {};
    intervalNames = [];
    elapsedTime = 0;
    constructor (start = true) {
        this.running = start;
    }
    
    //as long as the timer is running, causes timer to call callback with the name of the event at regular intervals 
    //or one-time only if repeat=false
    //if delay is smaller then time step (deltaTime), some callbacks will be missed
    addInterval(name, delay, callback, repeat=true, args=null) {  
        this.intervals[name] = {
            timeLeft: delay,
            delay: delay,
            callback: callback,
            repeat: repeat,
            called: false, //used to track if the callback was called in the case of one-time callbacka
            args: args
        }
    }

    //removes interval by name
    removeInterval(name) {
        delete(this.intervals[name]);
        
    }
    
    //stop the timer if it's started
    stop() {
        this.running = false;
    }
    
    //start the timer if it's stopped
    start() {
        this.running = true;
    }
    
    //process the update, to be called every frame
    tick() {
        if (this.running) {
            var dt = typeof deltaTime == 'undefined' ? 1 : deltaTime; 
            this.elapsedTime += dt;
            var intervalNames = Object.keys(this.intervals);
            for (var i = 0; i < intervalNames.length; i++) {
                var name = intervalNames[i];
                //countdown by the amount of time that passed during this tick
                //only count down if there is still time left 
                if (this.intervals[name].timeLeft > 0 ) {
                    this.intervals[name].timeLeft -= dt;    
                }
                
                if (this.intervals[name].timeLeft <= 0 ) {
                    //fire the callback when it's time and reset the countdown
                    this.intervals[name].callback(this.intervals[name].args);
                    //this.intervals[name].called = true;
                    if (!this.intervals[name].repeat) {
                        delete(this.intervals[name]);
                    }
                    else {
                        this.intervals[name].timeLeft = this.intervals[name].delay + this.intervals[name].timeLeft;
                    }
                    
                    
                }
            }
        }
    }
}

/*
Orchestrates the static experiment by scheduling events and controlling component changes.
*/
class DotExperimentManager {
    constructor(experiment) {
        this.experiment = experiment;
        this.experiment.endCallback = this.endOfExperiment.bind(this);
        this.timer = new Timer();
        this.finished = false;
        SYSTEMS.timer = this.timer;
        //initialize validity manager for validating user inputs
        this.validityManager = new ValidityManager(experiment.dots);
        SYSTEMS.validityManager = this.validityManager;
    }
    
    
    //starts the experiment, maintaining the timer used to display the dots
    start() {
        if (this.experiment.constructor.name == 'StaticDotExperiment') {            
            this.timer.addInterval('nextTrial', this.experiment.interval, this.nextTrial.bind(this));            
        }
        
        for (dot of this.experiment.dots) {
            /*
            var randomDisplayOffset = this.experiment.experimentConfig.randomIndicatorOffset * Math.random();
            randomDisplayOffset = isNaN(randomDisplayOffset) ? 0 : randomDisplayOffset;
            console.log('time to display indicator: ', dot.indicator.delay + randomDisplayOffset);
            //this needs to be made dependent upon the showing of dots
            this.timer.addInterval('displayIndicators', dot.indicator.delay + randomDisplayOffset, 
                               this.displayIndicators.bind(this), false);*/
            
        }
        
        this.timer.start();
    }
    
    //updates the experiment, if there are any time-dependent variables that need updating
    update() {
        this.timer.tick();
        this.experiment.update();
        
    }
    
    //advances to next trial
    nextTrial(x) {
        this.experiment.nextTrial();
        
    }
    
    //processes end of experiment signal
    endOfExperiment() {
        this.timer.stop();
    }
    
    //return the result
    getResult() {
        var result = {
            score: this.validityManager.score,
            tests: this.validityManager.tests,
        }
        return result;
    }
    
    //get total elapsed time
    getTime() {
        return this.timer.elapsedTime;
    }
    
    //outdated, under new design this is scheduled by the experiment's showDots function
    displayIndicators() {
        var dot = this.experiment.dots[0]; //for now, just use the first dot
        this.experiment.displayIndicators(); 
        //allow the user to interact with the experiments again
        this.validityManager.resetInputTest();
        //if the config specifies a random offset, include it as a delay        
        this.timer.addInterval('hideIndicators', dot.indicator.displayTime, 
                                       this.hideIndicators.bind(this), false);
        
    }
    //outdated, under new design this is scheduled by the experiment's showDots function
    hideIndicators() {
        var dot = this.experiment.dots[0]; //for now, just use the first dot
        //console.log('hiding indicators');
        this.experiment.hideIndicators();
        var randomDisplayOffset = this.experiment.experimentConfig.randomIndicatorOffset * Math.random();
        randomDisplayOffset = isNaN(randomDisplayOffset) ? 0 : randomDisplayOffset;
        console.log('time to display indicator: ', dot.indicator.delay + randomDisplayOffset);
        this.timer.addInterval('displayIndicators', dot.indicator.delay + randomDisplayOffset,
                               this.displayIndicators.bind(this), false);
    }
}

/*
Handles all user input.
*/
class InputManager {    
    //inputPlayback = {};
    
    keyPressed() {
        console.log(keyCode == KEYCODES.ARROW_LEFT || keyCode == KEYCODES.ARROW_RIGHT);
        //inputPlayback[SYSTEMS.timer.elapsedTime] = keyCode;
        if (recorder && !started) {
            started = true;
            experimentManager.start();
            recorder.start();
        }
        else {
            console.log('validating ', keyCode);
            SYSTEMS.validityManager.checkValidity(keyCode);
        }
    }

    
}

/*
Captures, stores and uploads session data to the server.
*/
class MediaCaptureManager {
    videosEnpoint = '/dataupload/videos';
    imagesEndpoint = '/dataupload/images';
    
    constructor(mediaStream) {
        //initialize recorder for video capture
        this.recorder = new MediaRecorder(mediaStream);
        this.recorder.ondataavailable = this.recorderDataAvailable;
        
        //initialize virtual canvas for stills capture
        this.video = document.createElement('VIDEO');
        this.video.srcObject = mediaStream;
        this.canvas = document.createElement('CANVAS');
        var videoSettings = mediaStream.getVideoTracks()[0].getSettings();
        this.canvas.width = videoSettings.width;
        this.canvas.height = videoSettings.height;
        this.canvas.appendChild(this.video);
        this.context = this.canvas.getContext('2d');
    }

    /*
    Takes a still image from the camera made available by the user and sends it to the server.
    Params:
        metadata - metadata that will be appended to the upload form data as a request body
    */
    takePicture(metadata) {
        this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        this.canvas.toBlob(function (blob) {
            var file = new File([blob], 'image');
            var fd = new FormData();
            fd.append('metadata', metadata);
            fd.append('image', file);
            var xhr = new XMLHttpRequest();
            xhr.open('POST', this.imagesEndpoint);
            xhr.send(fd);
        });
    }

    //starts recording experiment video
    startRecording() {
        this.recorder.start()
    }

    //callback for processing ready video data
    recorderDataAvailable(event) {
        var file = new File([event.data], 'video');
        var xhr = new XMLHttpRequest();
        xhr.open('POST', this.videosEndpoint);
        var fd = new FormData();
        fd.append('video', file);
        xhr.send(fd);
    }

    //stops recording experiment video
    stopRecording() {
        this.recorder.stop();
    }
}

/*
Checks validity of user input.
*/
class ValidityManager {
    //dots - dots which will be used for input validity processing
    constructor(dots) {
        this.dots = dots;
        this.score = 0;
        this.tests = 0;
        this.inputTested = false; //keep track of whtether input was already tested for this trial
    }
    
    //returns the count of indicators matching the given keyCode
    //in a regular scenario, we only care about a single dot, but the setup can be generalized
    checkValidity(keyCode) {
        //do not re-test if we have already tested the input
        if (this.inputTested) {
            return null;
        }
        else {
            this.inputTested = true;
            //count of valid inputs
            var valid = 0;
            for (var i = 0; i < this.dots.length; i++) {
                var dot = this.dots[i];
                console.log('checking for dot ', dot);
                //if the indicator is visible
                if (dot.indicator.color[3] != 0) {
                    //if the symbol of the indicator matches the key code, then the input is correct
                    if (SYMBOL_INPUT_MAP[dot.indicator.symbol] == keyCode) {
                        valid += 1;
                        dot.indicator.color = COLORS.GREEN; //green = correct answer
                    }
                    else {
                        dot.indicator.color = COLORS.RED; //red = incorrect answer
                    }
                }

                this.tests += 1; //count every test
            }
            this.score += valid; //keep track of total score if needed in future
            return valid;
        }
        
    }
    
    //resets the input test, so that inputs can be checked again
    //should be called whenever a new input should be received and processed
    resetInputTest() {
        this.inputTested = false;
    }
}

/*
Displays experiments, but does no processing or updating of data.
*/
class DisplayManager {
    constructor(experiment) {
        this.experiment = experiment;
    }
    
    display() {
        for (var i = 0; i < this.experiment.dots.length; i++) {
            var dot = this.experiment.dots[i];
            if (dot.visible) {
                //draw the pulse
                if (dot.pulsate) {
                    noFill();
                    stroke(0, dot.pulse.opacity);
                    strokeWeight(dot.pulse.strokeWeight);
                    circle(dot.x, dot.y, dot.pulse.r);
                }
                
                //draw the circle
                fill(DEFAULTSTYLE.fill);
                stroke(0, 255);
                circle(dot.x, dot.y, dot.r);
                
                var indicatorColor = dot.indicator.color;
                
                //draw the indicator
                if (indicatorColor[3] > 0) {
                    //display the indicator if it's visible (alpha > 0)
                    textAlign(CENTER);
                    textSize(dot.indicator.size);
                    strokeWeight(DEFAULTSTYLE.textStrokeWeight);
                    stroke(indicatorColor[0], indicatorColor[1], indicatorColor[2]);
                    fill(indicatorColor[0], indicatorColor[1], indicatorColor[2], indicatorColor[3]);
                    text(dot.indicator.symbol, dot.x, dot.y + dot.indicator.size / 4);
                    
                }
                
            }
            
        }
    }
}


//default experiment configs
var staticDotExperimentConfig = {
    trials: 10,
    interval: 4000,
    displayIndicators: true,
    displayVerification: true,
    snapAfterDisplay: 200,
    snapAfterVerification: 200
}

var movingDotExperimentConfig = {
    trials: 10,
    displayIndicators: true,
    indicatorCount: 1,
    randomIndicatorOffset: 2000,
    displayVerification: true
}

/*
Encapsulates the dot experiment data. Maintains information about dot states, but does no
displaying.
*/
class DotExperiment {
    //dots - Array of dots to display
    //experimentConfig - dictionary of experiment parameters (see above)
    //endCallback - callback to be called once the entire experiment is done
    constructor(dots, experimentConfig, endCallback = null, trialEndCallback = null) {
        this.dots = dots;
        console.log('[constructor] this.dots: ', this.dots);
        this.experimentConfig = experimentConfig;
        this.interval = typeof(experimentConfig) == 'undefined' ? null : experimentConfig.interval;
        this.endCallback = endCallback;
        this.trialsTotal = experimentConfig.trials;
        this.indicatorsTotal = experimentConfig.indicatorCount;
        this.trialsCompleted = 0;
        
        for (var i = 0; i < this.dots.length; i++) {
            //initialise the tween manager so that every dot pulsates according to its config
            var dot = this.dots[i];
            p5.tween.manager.addTween(dot.pulse, 'pulse'+i).addMotions([
                {key: 'r', target: dot.pulse.targetR},
                {key: 'strokeWeight', target: dot.pulse.targetStrokeWeight},
                {key: 'opacity', target: dot.pulse.targetOpacity}
            ], dot.pulse.period, 'easeOutQuad').startLoop();//*/
            
        }
    }
    
    //show dots passed by reference. if dots == null, show all dots
    showDots(dots) {
        console.log('showing dots, param == null? ', dots == null);
        console.log('this.dots = ', this.dots);
        if (dots == null) {
            for (var i = 0; i < this.dots.length; i++) {
                this.dots[i].visible = true;
                var randomDisplayOffset = this.experimentConfig.randomIndicatorOffset * Math.random();
                randomDisplayOffset = isNaN(randomDisplayOffset) ? 0 : randomDisplayOffset;
                console.log('time to display indicator: ', dot.indicator.delay + randomDisplayOffset);
                //this needs to be made dependent upon the showing of dots
                SYSTEMS.timer.addInterval('displayIndicators', dot.indicator.delay + randomDisplayOffset, 
                               this.displayIndicators.bind(this), false);
            }
        }
        
        else {
            for (dot of dots) {
                dot.visible = true;
            }
        }
        
        console.log('calling after show dots');
        this.afterShowDots(dots);
    }
    
    //additional function called after dots are shown - to be implemented in sub-classes
    afterShowDots(dots) {}
    
    //hide dots passed by reference. if dots == null, hide all dots
    hideDots(dots) {
        console.log('hiding dots');
        if (dots == null) {
            for (var i = 0; i < this.dots.length; i++) {
                this.dots[i].visible = false;
            }
        }
        
        else {
            for (dot of dots) {
                dot.visible = false;
            }
        }
    }
    
    //randomizes dot positions
    randomizeDots() {
        for (dot of this.dots) {
            //ensure dots don't end up barely in view
            var w = typeof width == 'undefined' ? dot.x : width;
            var h = typeof height == 'undefined' ? dot.y : height;
            // offset (larger) pulse radius and add fraction of maximum position (minus pulse r)
            dot.x = dot.pulse.targetR + Math.random() * (w - dot.pulse.targetR*2);
            dot.y = dot.pulse.targetR + Math.random() * (h - dot.pulse.targetR*2);            
            
        }
    }
    
    update() {
        
    }
    
    //advances to next trial
    nextTrial() {
        //if all trials are done, the experiment is over
        if (this.trialsCompleted >= this.trialsTotal) {
            this.endCallback();
        }
        else {
            this.trialsCompleted += 1;
            this.loadNextTrial(this.trialsCompleted, this.trialsTotal);
        }
    }
    
    //loads the specific configuration of the next trial
    //overloaded in children classes
    loadNextTrial(n, total) {
        
    }
    
    //displays indicators on dots
    displayIndicators() {
        if (this.indicatorsTotal == undefined || this.indicatorsTotal > 0) {
            
            for (var i = 0; i < this.dots.length; i++) {            
                var dot = this.dots[i];
                //change the indicator symbol
                dot.indicator.symbol = ["←", "→"][Math.round(Math.random())];
                dot.indicator.color = COLORS.WHITE;
                SYSTEMS.timer.addInterval('hideIndicators', dot.indicator.displayTime, 
                               this.hideIndicators.bind(this), false);
            }
            if (this.indicatorsTotal != undefined) {
                this.indicatorsTotal -= 1;
            }
            SYSTEMS.validityManager.resetInputTest(); // re-enable inputs
        }
    }
    
    //hides indicators on dots
    hideIndicators() {
        for (var i = 0; i < this.dots.length; i++) {
            var dot = this.dots[i];
            dot.indicator.color = COLORS.INVISIBLE;
        }
    }
}

/*
Subclass of DotExperiment specialized for displaying immobile dots every n miliseconds
*/
class StaticDotExperiment extends DotExperiment {
    //starts the dot experiment
    start() {
    
    }
    
    //loads the next trial - by default randomizes positions of dots
    loadNextTrial(n, total) {
        this.randomizeDots();
        this.showDots();
        SYSTEMS.timer.addInterval(null, this.interval/2, this.hideDots.bind(this), false);
        //SYSTEMS.timer.addInterval(null, this.interval*2, this.nextTrial, false);
        
    }
    
    afterShowDots(dots) { 
        console.log('after show dots');
    }
    
    
}

/*
Subclass of DotExperiment specialized for moving the dots on a specified trajectory.
*/
class MovingDotExperiment extends DotExperiment {
    segments = {}; //maintain a map of dot->segment for motion

    //pathEndCallback - called whenever the dot reaches the end of path
    constructor (dots, config, endCallback, pathEndCallback) {
        super(dots, config, endCallback);
        this.pathEndCallback = pathEndCallback;
        for (dot of dots) {
            this.addDotTrajectory(dot);
        }
    }

    addDotTrajectory(dot) {
        
        this.segments[dot] = {};
        this.segments[dot].trajectory = dot.trajectory;
        this.segments[dot].currentSegmentIx = 0;
        
    }

    //update locations of dots
    update() {
        
        for (var i = 0; i < this.dots.length; i ++) {
            var dot = this.dots[i];
            var currentSegment = this.segments[dot].trajectory[this.segments[dot].currentSegmentIx];
            var xSpeed = (currentSegment.endX - currentSegment.startX)/currentSegment.time;
            var ySpeed = (currentSegment.endY - currentSegment.startY)/currentSegment.time;
            var dt = typeof deltaTime == 'undefined' ? 16 : deltaTime; //16 ms = 1/60th of a second
            var dx = xSpeed * dt;
            var dy = ySpeed * dt;
            //if end of segment reached
            if (this.reachedEndOfSegment(dot, dx, dy, currentSegment)) {
                //if next segment available, load it and move on it
                if (this.segments[dot].currentSegmentIx + 1 < this.segments[dot].trajectory.length) {
                    //recalculate the segment index
                    var nextSegmentIx = this.segments[dot].currentSegmentIx + 1;
                    //load next segment
                    var nextSegment = this.segments[dot].trajectory[nextSegmentIx];
                    //update the segment index
                    this.segments[dot].currentSegmentIx = nextSegmentIx;
                    var excessTime = this.getExcessTime(dot, dx, dy, dt, currentSegment);
                    //recalculate x and y speed and x and y displacement on new segment
                    currentSegment = nextSegment;
                    xSpeed = (currentSegment.endX - currentSegment.startX)/currentSegment.time;
                    ySpeed = (currentSegment.endY - currentSegment.startY)/currentSegment.time;
                    dx = xSpeed * excessTime;
                    dy = ySpeed * excessTime;
                    this.dots[i].x += dx;
                    this.dots[i].y += dy;
                }           
            
                else {
                    //else stop the dot motion
                    if (typeof(this.pathEndCallback) != 'undefined') {
                        this.pathEndCallback();
                    }
                }
            }
            //else keep on going along the segment
            else {
                this.dots[i].x += dx;
                this.dots[i].y += dy;
            }
        }
        
    }
        
    //test if a dot will reach the end of segment by moving by dx, dy
    //returns true if both coordinates would be equal to or out of bounds for target X and Y
    //returns false otherwise
    reachedEndOfSegment(dot, dx, dy, segment) {
        var atEndOfX = false, atEndOfY = false;
        
        //simple out-of-bounds check
        if (dot.x + dx >= Math.max(segment.startX, segment.endX) || //if X increases over time, max = endX, dx > 0
            dot.x + dx <= Math.min(segment.startX, segment.endX)) { //if X decreases over time, min = endX, dx < 0
            atEndOfX = true;
        }
        
        if (dot.y + dy >= Math.max(segment.startY, segment.endY) ||
           dot.y + dy <= Math.min(segment.startY, segment.endY)) {
            atEndOfY = true;
        }
        
        return atEndOfX && atEndOfY;
    }

    //calculate time left for motion after the dot has reached the end of the segment.
    //in case the dot hasn't reached the end with dx, dy, return 0
    getExcessTime(dot, dx, dy, dt, segment) {
        var dist = Math.sqrt(dx*dx + dy*dy);
        var speed = dist/dt;
        var distLeft = Math.sqrt((segment.endX - dot.x)*(segment.endX - dot.x) + (segment.endY - dot.y)*(segment.endY - dot.y));
        if (dist < distLeft) { 
            return 0;
        }
        
        else {
            return (dist - distLeft)/speed;
        }
    }
}

/*
Holds information about a particular dot.
*/
class Dot {
    pulse = {
        r: 18,
        targetR: 50, //final radius
        strokeWeight: 1,
        targetStrokeWeight: 5, //final thickness of the pulse
        opacity: 255, //begin at this opacity
        targetOpacity: 1, //end at this opacity
        period: 300 //pulse period
    }
    indicator = {
        symbol: "←",
        size: 20,
        delay: 1000, //how late after displaying the dot should the indicator become visible
        displayTime: 2000, //how long the indicator should be displayed for
        color: [255, 255, 255, 0]
    }

    /*
    x, y - initial location of dot (pixels)
    r - radius in pixels
    pulsate - whether the dot should pulsate
    visible - whether the dot should be visible
    trajectory - what trajectory the dot should move alon
    */
    constructor(x, y, r = 18, pulsate = true, visible = true, trajectory = []) {        
        this.x = x;        
        this.y = y;
        this.r = r;
        this.pulsate = pulsate;
        this.visible = visible;
        this.trajectory = trajectory;
    }

}

let dot;
let staticDotExperiment;
let movingDotExperiment;
let experimentManager;
let displayManager;

//creates a zig-zag trajectory with n bounces 
//n - amount of bounces (default: 3)
//t - total time (time per segment = t/(n*2))
function generateZigZag(w, h, n=3, t=24000) {
    var trajectory = [];
    
    //calculate helper dimensions
    var segmentHeight = h / (n * 2);
    var segmentTime = t / (n * 2);
    
    for (var segment = 0; segment < n * 2; segment++) {
        if (segment % 2 == 0) {
            trajectory.push({startX: 0, 
                             startY: segmentHeight * segment, 
                             endX: w, 
                             endY: segmentHeight * (segment + 1), 
                             time: segmentTime});
        } //rightwards zig 
        else {
            trajectory.push({startX: w, 
                             startY: segmentHeight * segment, 
                             endX: 0, 
                             endY: segmentHeight * (segment + 1), 
                             time: segmentTime});
        } //leftwards zag
    }
    
    return trajectory;
}

var started = false;
var ready = false;
var recorder = null;
var readyButton;
function setup() {
    createCanvas(windowWidth, windowHeight);
    ellipseMode(CENTER);
    readyButton = createButton('Ready');
    readyButton.position(width/2, height/2);
    readyButton.mousePressed(readyUp);
    dot = new Dot(20, 20, 18, true, true, generateZigZag(width-40, height-40));
    staticDotExperiment = new StaticDotExperiment([dot], staticDotExperimentConfig);
    //movingDotExperiment = new MovingDotExperiment([dot], movingDotExperimentConfig, null, () => {recorder.stop(); fullscreen(false);});
    displayManager = new DisplayManager(staticDotExperiment);
    //displayManager = new DisplayManager(movingDotExperiment);
    SYSTEMS.displayManager = displayManager;
    
    inputManager = new InputManager;
    SYSTEMS.inputManager = inputManager;
    keyPressed = inputManager.keyPressed; //set inputManager as default keyPressed event handler
    
    experimentManager = new DotExperimentManager(staticDotExperiment);
    //experimentManager = new DotExperimentManager(movingDotExperiment);
    navigator.mediaDevices.getUserMedia({video:{width:{ideal:9999}, height:{ideal:9999}}, audio:false}).then((mediaStream) => {
        //recorder = new MediaRecorder(mediaStream);
        
        //recorder.ondataavailable = recordingAvailable;
        var mediaCaptureManager = new MediaCaptureManager(mediaStream);
        SYSTEMS.mediaCaptureManager = mediaCaptureManager;
        setInterval(takePicWithMeta.bind(this), 1000);
        
    });
    
    
}

function takePicWithMeta() {
    SYSTEMS.mediaCaptureManager.takePicture(performance.now());
}

function draw() {
    //dot.show();
    background(DEFAULTSTYLE.background);
    if (started) {
        //advance time
        experimentManager.update();
    }
    displayManager.display();
  // put drawing code here
}

function recordingAvailable(event) {
    console.log('sending video file');
    var vfile = new File([event.data], 'video'); 
    var fd = new FormData();
    fd.append('video', vfile);
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/dataupload');
    xhr.send(fd);
    
}

function readyUp() {
    fullscreen(true);
    resizeCanvas(displayWidth/displayDensity(), displayHeight/displayDensity());
    ready = true;
    //started=true;
    readyButton.hide();
}

module.exports = {
    DEFAULTSTYLE,
    COLORS,
    Dot,
    DotExperiment,
    StaticDotExperiment,
    MovingDotExperiment,
    DotExperimentManager,
    ValidityManager,
    Timer,
    staticDotExperimentConfig,
    movingDotExperimentConfig,
    generateZigZag
}