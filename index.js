const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middle ware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.afmql.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect();
        const serviceCollection = client.db("doctors_portal").collection("services");
        const bookingCollection = client.db("doctors_portal").collection("bookings");

        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const service = await cursor.toArray();
            res.send(service);
        });

        /**
         * API Naming COnvention 
         * app.get('booking) // get all booking in this collection or get more than one or by fillter
         * app.get('booking/:id) // get a specific booking
         * app.get('booking) add a new booking
         * app.get('booking)
         * app.get('booking)
        */
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