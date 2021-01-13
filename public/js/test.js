'use strict';

const expect = require('chai').expect;
const {DEFAULTSTYLE, Dot, DotExperiment, StaticDotExperiment, MovingDotExperiment, DotExperimentManager, Timer, staticDotExperimentConfig, movingDotExperimentConfig, ValidityManager, generateZigZag} = require('./sketch');


describe('defaults tests', function() {
    
    it('Default fill should be a number', () => {
        expect(DEFAULTSTYLE.fill).to.be.a('number');
    });
    it('Default fill should be 0', function(done) {
        expect(DEFAULTSTYLE.fill).to.equal(0);
        done();
    });
});

describe('Dot:', () => {
    let dot;
    before(() => {
        dot = new Dot(10, 20, 50);
    });
    
    it('should not be undefined', () => {
        expect(Dot).to.not.be.an('undefined');
    });
    
    it('should have proper coordinates and radius', () => {
        expect(dot.x).to.equal(10);
        expect(dot.y).to.equal(20);
        expect(dot.r).to.equal(50);
    });
    
    it('should pulsate by default', () => {
        expect(dot.pulsate).to.equal(true);
    });
    
    it('should be visible by default', () => {
        expect(dot.visible).to.equal(true);
    });
    
});

describe('DotExperiment:', () => {
    let de;
    let testvar = 0;
    before(() => {
        var config = {interval:1234, trials:10};
        var endcallback = () => { testvar = 1 };
        de = new DotExperiment([], config, endcallback.bind(this));
        
    })
    
    it('should properly initialize the configuration', () => {
        expect(de.interval).to.equal(1234);
        expect(de.trialsTotal).to.equal(10);
        expect(de.trialsCompleted).to.equal(0);
        expect(de.endCallback).to.be.a('function');
    });
    
    it('should properly advance through trials', () => {
        var trialNumber = de.trialsCompleted;
        de.nextTrial();
        expect(de.trialsCompleted).to.not.equal(trialNumber);
    });
    
    it('should properly call the end callback', () => {
        for (var i = 0; i < 10; i++) {
            de.nextTrial();
        } 
        expect(de.trialsCompleted).to.equal(10);
        expect(testvar).to.equal(1);
    });
    
})

describe('StaticDotExperiment:', () => {
    let sde;
    let de;
    let testdot, testdot2;
    before(() => {
        testdot = {x: 10, y:23, pulse:{targetR:50}, indicator:{symbol: "x"}};
        testdot2 = {x: 7, y: 51, pulse:{targetR:2}, indicator:{symbol: "←"}};
        sde = new StaticDotExperiment([], staticDotExperimentConfig);
        sde.dots = [testdot];
        de = new DotExperiment([], staticDotExperimentConfig);
        de.dots = [testdot2];
    });
    
    it('should not be undefined', () => {
        expect(StaticDotExperiment).to.not.be.an('undefined');
    });
    
    it('should not have this.dots as undefined', () => {
        expect(sde.dots).to.not.be.an('undefined');
    });
    
    it('should have a default timeout of 4000', () => {
        expect(sde.interval).to.equal(4000);
    });
    
    it('should maintain references to dots', () => {
        expect(sde.dots).to.include(testdot);
    });
    
    it('should randomize dots properly', () => {
        var x = sde.dots[0].x;
        var y = sde.dots[0].y;
        sde.randomizeDots();
        expect(x).to.not.equal(testdot.x);
        expect(y).to.not.equal(testdot.y);
    });
    
    it('should properly advance through trials', () => {
        var x = sde.dots[0].x;
        var y = sde.dots[0].y;
        sde.nextTrial();
        expect(x).to.not.equal(sde.dots[0].x);
        expect(y).to.not.equal(sde.dots[0].y);
    });
    
    it('should randomize indicators', () => { 
        
        var indicator = de.dots[0].indicator.symbol;
        var changes = 0;
        //it's almost impossible for the symbol to not change in 50 randomization cycles
        for (var i = 0; i < 50; i++) {
            de.randomizeDots();
            if (de.dots[0].indicator.symbol != indicator) {
                changes += 1;
                indicator = de.dots[0].indicator.symbol;
            }
        }
        
        expect(changes).to.be.above(0);
    });
});

describe('Timer', () => {
    let timer = null;
    let x;
    before(() => {
        timer = new Timer();
    });
    
    it('should start at 0', () => {
        expect(timer.elapsedTime).to.equal(0);
    });
    
    it('should increase elapsedTime after a tick', () => {
        timer.tick();
        expect(timer.elapsedTime).to.be.above(0);
    });
    
    it('should stop on command', () => {
        timer.stop();
        expect(timer.running).to.equal(false);
    });
    
    it('should not update elapsed time when stopped', () => {
        var e = timer.elapsedTime;
        timer.tick();
        expect(timer.elapsedTime).to.equal(e);
    });
    
    it('should start on command', () => {
        timer.start();
        expect(timer.running).to.equal(true);
    });
    
    it('should update elapsed time once restarted', () => {
        var e = timer.elapsedTime;
        timer.tick();
        expect(timer.elapsedTime).to.not.equal(e);
    });
    
    it('should keep track of intervals', () => {
        timer.addInterval('test', 1000, () => {});
        expect(timer.intervals).to.not.be.empty;
        expect(timer.intervals['test']).to.be.an('object');
        expect(timer.intervals['test']['timeLeft']).to.be.a('number');
        expect(timer.intervals['test']['callback']).to.be.a('function');
    });
    
    it('should callback on set intervals', () => {
        function f(name) { x = name; };
        timer.addInterval('test123', 2, f);
        expect(x).to.be.an('undefined');
        timer.tick();
        expect(x).to.be.an('undefined');
        timer.tick();
        expect(x).to.equal('test123');
    });
    
    it('should remove interval callbacks', () => {
        function f(name) { x = name };
        x = '0';
        expect(x).to.equal('0');
        timer.addInterval('test123', 2, f);
        timer.tick();
        timer.tick();
        expect(x).to.equal('test123');
        x = '';
        timer.tick();
        timer.removeInterval('test123');
        timer.tick();
        expect(x).to.equal('');
        
    });
    
    it('should callback only once when told to', () => {
        function f(name) { x = name; };
        timer.addInterval('testRepeat', 4, f);
        timer.addInterval('testOnce', 2, f, false);
        timer.tick();
        timer.tick();
        expect(x).to.equal('testOnce');
        x = '';
        timer.tick();
        timer.removeInterval('testRepeat');
        timer.tick();
        expect(x).to.equal('');
    })
});

describe('MovingDotExperiment', () => {
   let mde = null;
    let testdot = {x: 10, y: 15, trajectory : [{startX:10, startY:15, endX:200, endY:75, time:1000}, 
                                               {startX:200, startY:75, endX:220, endY:95, time:1000}]};
    before(() => {
        mde = new MovingDotExperiment([], movingDotExperimentConfig);
        //mde.dots = [testdot];
    });
    
    it ('should not be undefined', () => { 
        expect(MovingDotExperiment).to.not.be.an('undefined');
    });

    it('should maintain a list of segments for each dot', () => {
        mde.addDotTrajectory(testdot);
        expect(mde.segments).to.not.be.empty; 
        expect(mde.segments[testdot].trajectory).to.equal(testdot.trajectory);
    });
    
    it('should detect when a dot has reached the end of segment', () => {
        expect(mde.reachedEndOfSegment(testdot, 1, 1, testdot.trajectory[0])).to.equal(false);
        expect(mde.reachedEndOfSegment(testdot, 200, 65, testdot.trajectory[0])).to.equal(true);
        expect(mde.reachedEndOfSegment(testdot, -5, -5, {startX:10, startY:20, endX:0, endY:0, time:1000})).to.equal(false);
        expect(mde.reachedEndOfSegment(testdot, -10, -16, {startX:10, startY:20, endX:0, endY:0, time:1000})).to.equal(true);
    });
    
    it('should properly calculate excess time at the end of segment', () => {
        expect(mde.getExcessTime(testdot, 1, 1, 16, testdot.trajectory[0])).to.equal(0);
        expect(mde.getExcessTime(testdot, 10, 0, 16, {startX:1, startY:1, endX:10, endY:15, time:1000})).to.equal(16);
        expect(mde.getExcessTime(testdot, 6, 8, 20, {startX:1, startY:1, endX:13, endY:19, time:1000})).to.equal(10);
        expect(mde.getExcessTime(testdot, 4, 7, 16, {startX:1, startY:1, endX:11, endY:17, time:1000})).to.equal(11.562398430198167);
    });
    
    it('should properly move the dot', () => {
        var x = testdot.x;
        var y = testdot.y;
        mde.dots = [testdot];
        mde.update();
        expect(x).to.not.equal(testdot.x);
        expect(y).to.not.equal(testdot.y);
        expect(testdot.x).to.equal(190/1000*16+x);
        expect(testdot.y).to.equal(60/1000*16+y);
    });
    
    it('should properly advance to the next segment', () => {
        var x = testdot.x;
        var y = testdot.y;
        var ix = mde.segments[testdot].currentSegmentIx;
        var cs = mde.segments[testdot].trajectory[i];
        expect(ix).to.equal(0);
        for (var i = 0; i < 984; i += 16) {
            mde.update();
        }
        expect(mde.segments[testdot].currentSegmentIx).to.equal(1);
        
    });
    
    it('should properly announce end of path', () => {
        let testvar = 0;
        var pathEnd = function() { testvar = 1; }
        var md = new MovingDotExperiment([], movingDotExperimentConfig, undefined, pathEnd.bind(this));
        expect(testvar).to.equal(0);
        var d = {x: 0, y: 0, trajectory: [{startX: 0, startY: 0, endX: 20, endY:25, time: 64}]};
        md.dots = [d];
        md.addDotTrajectory(d);
        for (var i = 0; i < 64; i += 16) {
            md.update();
        }
        expect(testvar).to.equal(1);
    });
});

describe('DotExperimentManager', () => {
    let sde, mde, manager;
    let testdot = {x: 20, y:55, pulse:{targetR: 32}, indicator:{delay:200, color:[0,0,0,0]}};
    let testdot2 = {x: 20, y:55, pulse:{targetR: 32}, indicator:{delay:2, displayTime:3, color:[0,0,0,0]}};
    let expConfig = {trials:2, interval: 32};
    let expConfig2 = {trials:6000, interval:3};
    before(() => {
        sde = new StaticDotExperiment([], expConfig);
        sde.dots = [testdot];
        manager = new DotExperimentManager(sde);
    })
    
    
    it('should keep track of its assigned experiment', () => {
        expect(manager.experiment).to.not.be.an('undefined');
    });
    
    it('should properly collect data at the end of the experiment', () => {
        manager.start();
        manager.validityManager.checkValidity(39);
        manager.validityManager.resetInputTest();
        manager.validityManager.checkValidity(37);
        for (var i = 0; i < 96; i++) {
            manager.update();
        }
        expect(manager.timer.running).to.equal(false);
        expect(manager.getResult().score).to.equal(0);
        expect(manager.getResult().tests).to.equal(2);
        expect(manager.getTime()).to.equal(96);
    });
    
    it('should properly display indicators', () => {
        sde.dots[0].indicator.color[3] = 0;
        manager.displayIndicators();
        expect(sde.dots[0].indicator.color).to.eql([255,255,255,255]);
    });
    
    it('should properly schedule dot hiding and showing', () => {
        var s = new StaticDotExperiment([], expConfig2);
        s.dots = [testdot2];
        var mng = new DotExperimentManager(s);
        mng.start();
        for (var i = 0; i < 6000; i++) {
            var step = i % 5;
            if (step < 2) {
                expect(testdot2.indicator.color).to.eql([0,0,0,0]);
            }
            else {
                expect(testdot2.indicator.color).to.eql([255,255,255,255]);
                
            }
            mng.update();
            
        }
    });
});

describe('ValidityManager', () => {
    var dot = {x:1, y:7, indicator:{symbol:"←", color:[255,255,255,255]}};
    let vm;
    beforeEach(() => {
        vm = new ValidityManager([dot]);
    })
    
    it('should keep track of its dots', () => {
        expect(vm.dots[0]).to.equal(dot);
        expect(vm.dots[0].x).to.equal(1);
        dot.x = 9;
        expect(vm.dots[0].x).to.equal(9);
    });
    
    it('should properly reset its input', () => {
        expect(vm.inputTested).to.equal(false);
        vm.checkValidity(21);
        expect(vm.inputTested).to.equal(true);
        vm.resetInputTest();
        expect(vm.inputTested).to.equal(false);
    });
    
    it('should properly validate input', () => {
        var result = vm.checkValidity(37);
        expect(result).to.equal(1);
        expect(vm.score).to.equal(1);
        expect(vm.tests).to.equal(1);
        vm.resetInputTest();
        var result2 = vm.checkValidity(36);
        expect(result2).to.equal(0);
        expect(vm.score).to.equal(1);
        expect(vm.tests).to.equal(2);
        dot.indicator.symbol = "→";
        vm.resetInputTest();
        var result3 = vm.checkValidity(39);
        expect(result3).to.equal(1);
        expect(vm.score).to.equal(2);
        expect(vm.tests).to.equal(3);
    });
    
    it('should change the color of the dot appropriately', () => {
        vm.checkValidity(39);
        expect(dot.indicator.color).to.eql([0,255,0,255]);
        vm.resetInputTest();
        vm.checkValidity(37);
        expect(dot.indicator.color).to.eql([255,0,0,255]);
    });
    
    it('should not test validity twice on repeated input within same trial', () => {
        expect(vm.tests).to.equal(0);
        vm.checkValidity(39);
        expect(dot.indicator.color).to.eql([0,255,0,255]);
        expect(vm.score).to.equal(1);
        expect(vm.tests).to.equal(1);
        vm.checkValidity(40);
        expect(vm.score).to.equal(1);
        expect(vm.tests).to.equal(1);
    });
})

describe('generateZigZag:', () => {
    it('should properly generate the minimal zig-zag', () => {
        var trajectory = generateZigZag(10, 10, 1, 10);
        expect(trajectory).to.eql([{startX: 0, startY:0, endX:10, endY:5, time: 5},
                                   {startX: 10, startY:5, endX:0, endY:10, time:5}]);
    });
    
    it('should properly generate the default zig-zag', () => {
        var trajectory = generateZigZag(6, 6);
        expect(trajectory).to.eql([{startX: 0, startY:0, endX: 6, endY: 1, time: 4000},
                                  {startX:6, startY: 1, endX: 0, endY: 2, time: 4000},
                                  {startX: 0, startY: 2, endX: 6, endY: 3, time: 4000},
                                  {startX:6, startY: 3, endX: 0, endY: 4, time: 4000},
                                  {startX: 0, startY: 4, endX: 6, endY: 5, time: 4000},
                                  {startX:6, startY: 5, endX: 0, endY: 6, time: 4000}]);
    }); 
});