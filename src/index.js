const { Router } = require('express');
var express = require('express');
var multer  = require('multer');
var uuid = require('uuid');
//var upload = multer({ dest: 'uploads/' })
var upload = multer({storage: dStorage});
var app = express();
const port = 3000;

var dStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        //console.log(req, '\n', file);
        //console.log('file body ', file.body);
        //var meta = req.body.metadata;
        if (file.fieldname == 'video') {
            cb(null, "./uploads/videos/");
        }
        else{
            cb(null, "./uploads/images/"); 
        }
        
    },
    filename: function (req, file, cb) {
        //console.log('filename for: ', file);
        var meta = req.body.metadata == undefined ? '' : '-' + req.body.metadata;
        var id = uuid.v4()
        var ext = file.fieldname == 'image' ? '.jpg' : '';
        console.log('saving file as ' + file.fieldname + "-" + id + meta + ext);
        
        cb(null, file.fieldname + "-" + id + meta + ext);
    }
})
//setInterval(() => { console.log(Date() + " memory usage: " + process.memoryUsage().heapUsed + " / " + process.memoryUsage().heapTotal );}, 1000)
app.use(express.static('public'));
app.use(multer({storage:dStorage}).fields([{name:'video', maxCount: 1}, {name:'image', maxCount:3}]));

app.listen(port, () => {
    console.log("Listening on " + port);
});

app.get('/', (req, res) => {
    res.send("Hello world!");
});

app.post('/dataupload/videos', upload.any(), (req, res) => {
    //console.log("body: ", req.body);
    res.status(200).send();//"Video upload endpoint");
});

app.post('/dataupload/images', (req, res) => {
    res.send("Image upload endpoint");
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