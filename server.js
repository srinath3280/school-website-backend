require('dotenv').config();
const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const cloudinary = require('cloudinary').v2;
const app = express();
const upload = multer();


const secretKey = 'your_secret_key';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// // Create a MySQL connection pool
// const pool = mysql.createPool({
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME,
// });

// Create a MySQL connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// db.connect((err) => {
//     if (err) {
//         console.error('Database connection error:', err);
//     } else {
//         console.log('Connected to MySQL database');
//     }
// });

// Generate a new user_id based on the maximum existing one
const generateNewUserId = async () => {
    return new Promise((resolve, reject) => {
        db.query('SELECT MAX(user_id) AS max_user_id FROM app_user', (err, results) => {
            if (err) {
                reject(err);
            } else {
                const new_user_id = (results[0].max_user_id || 0) + 1;
                resolve(new_user_id);
                // console.log(new_user_id)
            }
        });
    });
};
const generateNewUserId1 = async () => {
    return new Promise((resolve, reject) => {
        db.query('SELECT MAX(app_login_key) AS max_login_key FROM app_login_suc', (err, results) => {
            if (err) {
                reject(err);
            } else {
                const new_user_id1 = (results[0].max_login_key || 0) + 1;
                resolve(new_user_id1);
                // console.log(new_user_id1)
            }
        });
    });
};
const generateNewLoginFail = async () => {
    return new Promise((resolve, reject) => {
        db.query('SELECT MAX(app_login_fail_id) AS max_login_fail_key FROM app_login_fail', (err, results) => {
            if (err) {
                reject(err);
            } else {
                const new_user_id2 = (results[0].max_login_fail_key || 0) + 1;
                resolve(new_user_id2);
                // console.log(new_user_id2)
            }
        });
    });
};

const now = new Date();

// Function to format the date as YYYY-MM-DD
const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Pad single-digit months with a leading zero
    const day = String(date.getDate()).padStart(2, '0'); // Pad single-digit days with a leading zero
    return `${year}-${month}-${day}`;
};

// Function to format the time as HH:MM:SS
const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0'); // Pad single-digit hours with a leading zero
    const minutes = String(date.getMinutes()).padStart(2, '0'); // Pad single-digit minutes with a leading zero
    const seconds = String(date.getSeconds()).padStart(2, '0'); // Pad single-digit seconds with a leading zero
    return `${hours}:${minutes}:${seconds}`;
};

// Combine the formatted date and time
const created_dt = `${formatDate(now)} ${formatTime(now)}`;
// console.log(formattedDateTime)

// POST endpoint to add a new user
app.post('/register', async (req, res) => {
    try {
        var { firstname, lastname, password } = req.body;

        const name = firstname + lastname;
        if (!name || !password) {
            return res.status(400).json({ error: 'Name and password are required' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const new_user_id = await generateNewUserId();
        const app_user_key_id = new_user_id; // Assuming same as user_id

        //   const created_dt = new Date();
        const user = {
            user_id: new_user_id,
            name,
            created_dt,
            modified_dt: created_dt,
            password: hashedPassword,
            password_dt: created_dt,
            password_ch_dt: created_dt,
            app_user_key_id,
            status: 'A', // active
            app_user_type_id: 1, // Example type ID
            user_type_code: 3, // Example type code
            created_user: 'admin', // or other appropriate default
            system_user_id: 'system01', // or other appropriate default
            entity_business_id: 1, // Example business ID
        };

        db.query('INSERT INTO app_user SET ?', user, (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Error inserting user into database' });
            }

            res.status(201).json({ message: 'User created successfully', user_id: new_user_id });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});


app.post('/upload', upload.single('audio'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }

    // Assuming you want to convert the audio to base64 and store it in a .txt file
    const base64Audio = req.file.buffer.toString('base64');
    const textFilePath = path.join(__dirname, 'recorded_audio.txt');

    fs.writeFile(textFilePath, base64Audio, (err) => {
        if (err) {
            return res.status(500).send('Error saving the audio');
        }
        res.status(200).send('Audio saved successfully');
    });
});


function queryDatabase(query) {
    return new Promise((resolve, reject) => {
        db.query(query, (err, result) => {
            if (err) {
                reject(err); // Reject the promise if there's an error
            } else {
                resolve(result); // Resolve the promise with the result
            }
        });
    });
}

app.post('/login', async function (req, res) {
    // console.log(req.body);
    const { username, password } = req.body;
    const user = username;

    try {
        const result = await queryDatabase(`SELECT * FROM app_user WHERE name = "${user}"`);

        const resultDetails = result[0];
        const new_user_id1 = await generateNewUserId1();
        const new_user_id2 = await generateNewLoginFail();

        const isMatch = await bcrypt.compare(password, resultDetails.password);

        if (isMatch) { // If password matches
            const token = jwt.sign({ username: user.username }, secretKey, { expiresIn: '1h' });
            const user_login_success = {
                app_login_key: new_user_id1,
                login_time: created_dt,
                logout_time: created_dt,
                session_key: token,
                user_id: resultDetails.user_id,
                user_type_code: resultDetails.user_type_code,
                user_name: resultDetails.name,
                system_user_id: resultDetails.system_user_id,
                status: resultDetails.status, // active
            };
            // console.log(user_login)
            db.query('INSERT INTO app_login_suc SET ?', user_login_success, (err, results) => {
                if (err) {
                    return res.status(500).json({ error: 'Error inserting user into database' });
                }
            });
            return res.status(200).json({ token }); // Return JWT token
        } else {
            const user_login_fail = {
                app_login_fail_id: new_user_id2,
                user_id: resultDetails.user_id,
                reason: "Wrong Password",
                login_date: created_dt,
                user_type_code: resultDetails.user_type_code,
            }
            // console.log(user_login_fail);

            db.query('INSERT INTO app_login_fail SET ?', user_login_fail, (err, results) => {
                if (err) {
                    return res.status(500).json({ error: 'Error inserting user into database' });
                }
                // res.status(201).json({ message: 'User created successfully', user_id: new_user_id1 });
            });

            return res.json({ message: 'Invalid username or password' }); // Password mismatch
        }
    }
    catch (error) {
        return res.send('Error', error)
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

app.post('/image', upload.single('file'), (req, res) => {
    const file = req.body.file;
    // console.log(file)
    // res.send(file)
    cloudinary.uploader.upload(file, { resource_type: 'auto', folder: 'capture_folder' })
        .then((result) => {
            res.json({ url: result.secure_url });
        })
        .catch((err) => {
            res.status(500).json({ error: err.message });
        });
});

// app.post('/image', verifyToken, upload.none(), async function (req, res) {
//     console.log(req.body)
//     // console.log(req.file.path)
//     try {
//         const { image } = req.body;
//         const saveFile = JSON.parse(fs.readFileSync('files/imageCapture.txt').toString());
//         if (image !== null) {
//             saveFile.push(image);
//         }
//         fs.writeFileSync('files/imageCapture.txt', JSON.stringify(saveFile));
//         // const newSelfie = new Selfie({ image });
//         // await newSelfie.save();
//         res.status(200).send('Image uploaded successfully');
//     } catch (error) {
//         console.error('Error uploading image:', error);
//         res.status(500).send('Internal Server Error');
//     }
// })
app.listen(process.env.PORT, () => { console.log('Server running on ' + process.env.PORT) })