require('dotenv').config();
const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const cors = require('cors');
const app = express();
const upload = multer();

const secretKey = 'your_secret_key';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.post('/register', function (req, res) {
    console.log(req.body)
    const userDetails = JSON.parse(fs.readFileSync('files/register.txt').toString());
    console.log(userDetails)
    userDetails.push(req.body);
    fs.writeFileSync('files/register.txt', JSON.stringify(userDetails));
    res.status(200).send('Registered successfully');
})

app.post('/login', function (req, res) {
    // console.log(req.body);
    const user = req.body;
    try {
        const data = JSON.parse(fs.readFileSync('files/register.txt').toString());
        const detail = data.filter((d) => {
            if (user.username === d.username && user.password === d.password) {
                const token = jwt.sign({ username:user.username,password:user.password  }, secretKey, { expiresIn: '1h' });
                res.json({ token });
            }
            else {
                return false;
            }
        })
        res.json(detail);
    }
    catch (error) {
        res.send('Error', err)
    }
})

function verifyToken(req, res, next) {
    const token = req.headers.authorization;
    if (!token) return res.status(401).send('Unauthorized');

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) return res.status(403).send('Forbidden');
        req.user = decoded;
        next();
    });
}

app.post('/image',verifyToken, upload.none(), async function (req, res) {
    // console.log(req.body)
    try {
        const { image } = req.body;
        const saveFile = JSON.parse(fs.readFileSync('files/imageCapture.txt').toString());
        if (image !== null) {
            saveFile.push(image);
        }
        fs.writeFileSync('files/imageCapture.txt', JSON.stringify(saveFile));
        // const newSelfie = new Selfie({ image });
        // await newSelfie.save();
        res.status(200).send('Image uploaded successfully');
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).send('Internal Server Error');
    }
})
app.listen(process.env.PORT, () => { console.log('Server running on ' + process.env.PORT) })