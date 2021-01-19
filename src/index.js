const { Router } = require('express');
var express = require('express');
var multer  = require('multer');
var uuid = require('uuid');
var fs = require('fs');
var session = require('express-session');
//var upload = multer({ dest: 'uploads/' })
var upload = multer({storage: dStorage});
var app = express();

const port = 3000;

var dStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        //console.log(req, '\n', file);
        //console.log('file body ', file.body);
        //var meta = req.body.metadata;
        console.log('Received data for session ID ', req.session.id);
        
        if (file.fieldname == 'video') {
            //console.log('video req body: ', req.body);
            cb(null, "./uploads/videos/");
        }
        else if (file.fieldname == 'image') {
            cb(null, "./uploads/images/"); 
        }
        
    },
    filename: function (req, file, cb) {
        //console.log('filename for: ', file);
        var meta = req.body.metadata == undefined ? '' : '-' + req.body.metadata;
        var ext = file.fieldname == 'image' ? '.jpg' : '';
        //console.log('req body: ', req.body);
        console.log('saving file as ' + req.session.id + "-" + meta + ext);
        
        cb(null, req.session.id + '-' + meta + ext);
        
        
    }
})
//setInterval(() => { console.log(Date() + " memory usage: " + process.memoryUsage().heapUsed + " / " + process.memoryUsage().heapTotal );}, 1000)
app.use(express.static('public'));
app.use(session({
    secret: '208885882325201283',
    resave: false,
    saveUninitialized: true
}));
app.use(multer({storage:dStorage}).fields([
    {name:'video', maxCount: 1}, 
    {name:'image', maxCount:3},
    //{name:'statistics', maxCount:1}
]));

app.listen(port, () => {
    console.log("Listening on " + port);
});

app.get('/', (req, res) => {
    res.send("");
});

app.post('/dataupload/videos', upload.any(), (req, res) => {
    //console.log("body: ", req.body);
    res.status(200).send();//"Video upload endpoint");
});

app.post('/dataupload/images', (req, res) => {
    res.status(200).send();//send("Image upload endpoint");
});

app.post('/dataupload/statistics', (req, res) => {
    var stats = JSON.parse(req.body.statistics);
    var meta = '-' + req.body.metadata;
    console.log(req.session.id, ' received statistics');
    fs.writeFile('./uploads/statistics/' + req.session.id + meta + '.json', JSON.stringify(stats), function(err) {
        if (err) {
            return console.log(err);
        }
        console.log('saved file ./uploads/statistics/' + req.session.id + meta + '.json');
    });
    res.status(200).send();//send("Image upload endpoint");
});

/*
app.post('/dataupload/video', upload.single('video'), function (req, res, next) {
    //console.log('got request');
    //console.log(req.file.mimetype);
    console.log(Date(), ': received an upload of ', req.file.mimetype);
    //req.file.mv('uploads/images/' + req.file.filename);
    
  // req.file is the `avatar` file
  // req.body will hold the text fields, if there were any
})

app.post('/dataupload/images', upload.array('images'), function(req, res, next) {
    console.log(Date(), ': received image upload');
    //console.log('reqest: ', req);
    console.log('files: ', req.files);
    console.log('destination: ', req.destination);
    
    //console.log('response: ', res);
})*/