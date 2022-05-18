const { MongoClient, ServerApiVersion, BSONRegExp } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middle ware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.afmql.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: `UnAuthorized access` });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });

}


// verify jwt token and handle unathorized access
// function verifyJWT(req, res, next) {
//     const authHeader = req.headers.authorization;
//     if (!authHeader) {
//         return res.status(401).send({ message: 'unauthorized access' })
//     }
//     const token = authHeader.split(' ')[1];
//     // verify a token symmetric
//     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
//         if (err) {
//             return res.status(403).send({ message: 'Forbidden access' })
//         }
//         req.decoded = decoded;
//         next();
//     });
// }

async function run() {
    try {
        await client.connect();
        const serviceCollection = client.db("doctors_portal").collection("services");
        const bookingCollection = client.db("doctors_portal").collection("bookings");
        const userCollection = client.db("doctors_portal").collection("users");

        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const service = await cursor.toArray();
            res.send(service);
        });


        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const user = req.body;
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ result, token });
        });

        // warning
        // THis is not the Proper way to query . 
        // After Learning about mongodb . use aggregate lookup , pipeline , match, group 
        app.get('/available', async (req, res) => {
            const date = req.query.date || '';
            // step1. get all services
            const services = await serviceCollection.find().toArray();
            // steps2 . get the booking of that day. Output structure: [{}, {}, {}, {},{}, {}, {}]
            const query = { date: date };
            const bookings = await bookingCollection.find(query).toArray();

            // sets3 . for each service , find bookings for that serive
            services.forEach(service => {
                const serviceBooking = bookings.filter(book => book.treatmentName === service.name);
                // steps 5 selected slots for the service bookings ['','','','','']
                const booked = serviceBooking.map(book => book.slot);
                //steps 6 select those slots that are not in boookedSlots
                const available = service.slots.filter(slot => !booked.includes(slot));
                //steps 7: set avaiable to slots to make it easier.
                service.slots = available;
            })
            res.send(services);
        })


        /*
         * API Naming COnvention 
         * app.get('booking) // get all booking in this collection or get more than one or by fillter
         * app.get('booking/:id) // get a specific booking
         * app.get('booking) add a new booking
         * app.get('booking)
         * app.get('booking)
        */

        app.get('/booking', verifyJWT, async (req, res) => {
            const patient = req.query.patient;
            // const query = { patient: patient };
            // const bookings = await bookingCollection.find(query).toArray();
            // res.send(bookings);
            const decodedEmail = req.decoded.email;
            if (patient === decodedEmail) {
                const query = { patient: patient };
                const bookings = await bookingCollection.find(query).toArray();
                return res.send(bookings);
            } else {
                return res.status(403).send({ message: 'Forbidden access' });
            }

        })


        app.post('/booking', async (req, res) => {
            const booking = req.body;
            // console.log("bookin", booking.treatmentName);
            const query = { treatmentName: booking.treatmentName, date: booking.date, patient: booking.patient };
            const exists = await bookingCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists });
            }
            const result = await bookingCollection.insertOne(booking);
            res.send({ success: true, result });
        });


    } finally {

    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('HEllo From Doctors Uncle')
});

app.listen(port, () => {
    console.log(`Doctors app listening on port ${port}`)
});