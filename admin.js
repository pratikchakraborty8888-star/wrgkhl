const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
    // Save Ticker Broadcast
    const saveTickerBtn = document.getElementById("saveTickerBtn");
    if (saveTickerBtn) {
        saveTickerBtn.onclick = async () => {
            const text = document.getElementById("adminTickerInput").value.trim();
            if (!text) return alert("Please enter ticker text.");
            try {
                await db.collection("settings").doc("ticker").set({ text });
                alert("Live marquee ticker updated successfully!");
            } catch (e) {
                alert("Error updating ticker.");
            }
        };
    }

    // Save Promo Code
    const savePromoBtn = document.getElementById("savePromoBtn");
    if (savePromoBtn) {
        savePromoBtn.onclick = async () => {
            const code = document.getElementById("adminPromoCode").value.trim().toUpperCase();
            const discountPercent = parseFloat(document.getElementById("adminPromoDiscount").value);
            if (!code || isNaN(discountPercent)) return alert("Enter valid code and discount percentage.");
            try {
                await db.collection("promos").doc(code).set({ discountPercent });
                alert(`Promo code ${code} saved successfully!`);
            } catch (e) {
                alert("Error saving promo code.");
            }
        };
    }

    // Load Live Orders
    const ordersTableBody = document.getElementById("adminOrdersTableBody");
    if (ordersTableBody) {
        db.collection("orders").orderBy("createdAt", "desc").onSnapshot(snapshot => {
            if (snapshot.empty) {
                ordersTableBody.innerHTML = `<tr><td colspan="6" style="padding: 15px; text-align: center; color: #888;">No orders found.</td></tr>`;
                return;
            }
            let html = "";
            snapshot.forEach(doc => {
                const order = doc.data();
                html += `
                    <tr style="border-bottom: 1px solid #222;">
                        <td style="padding: 10px; color: var(--neon-purple); font-weight: bold;">${order.orderId}</td>
                        <td style="padding: 10px;">${order.phone}</td>
                        <td style="padding: 10px;">Rs. ${order.total}</td>
                        <td style="padding: 10px;">${order.utr}</td>
                        <td style="padding: 10px;"><span style="padding: 3px 8px; border-radius: 4px; font-size: 11px; background: ${order.status === 'COMPLETED' ? '#00ff6633' : order.status === 'CANCELLED' ? '#ff005533' : '#ffaa0033'}; color: ${order.status === 'COMPLETED' ? '#00ff66' : order.status === 'CANCELLED' ? '#ff0055' : '#ffaa00'};">${order.status}</span></td>
                        <td style="padding: 10px; display: flex; gap: 5px;">
                            <button onclick="updateOrderStatus('${order.orderId}', 'COMPLETED')" style="background:#00ff6622; color:#00ff66; border:1px solid #00ff66; padding:4px 8px; border-radius:4px; cursor:pointer;">Complete</button>
                            <button onclick="updateOrderStatus('${order.orderId}', 'CANCELLED')" style="background:#ff005522; color:#ff0055; border:1px solid #ff0055; padding:4px 8px; border-radius:4px; cursor:pointer;">Cancel</button>
                        </td>
                    </tr>
                `;
            });
            ordersTableBody.innerHTML = html;
        });
    }
});

window.updateOrderStatus = async function(orderId, status) {
    try {
        await db.collection("orders").doc(orderId).update({ status });
        alert(`Order ${orderId} marked as ${status}`);
    } catch (e) {
        alert("Failed to update status.");
    }
};
