const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

async function audit() {
  console.log("--- BATCH AUDIT ---");
  const batches = await db.collection('batches').get();
  batches.forEach(b => {
    console.log(`ID: ${b.id} | Name: ${b.data().name} | Status: ${b.data().status}`);
  });

  console.log("\n--- USER AUDIT ---");
  const users = await db.collection('users').get();
  users.docs.forEach(d => {
    const data = d.data();
    if (data.name && data.name.toUpperCase().includes('ROHIT')) {
      console.log(`FOUND ROHIT: ${d.id}`);
      console.log(JSON.stringify(data, null, 2));
    }
    if (data.name && data.name.toUpperCase().includes('KUSHAL')) {
      console.log(`FOUND KUSHAL: ${d.id}`);
      console.log(JSON.stringify(data, null, 2));
    }
  });
}

audit().then(() => process.exit(0));
