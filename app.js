// Live Firebase Configuration for Cyber Store Admin
const firebaseConfig = {
    apiKey: "AIzaSyDUowN2gw6HvlBooZw2VDbroabjGhjMlRM",
    authDomain: "cyber-store-b2668.firebaseapp.com",
    projectId: "cyber-store-b2668",
    storageBucket: "cyber-store-b2668.firebasestorage.app",
    messagingSenderId: "1014814260411",
    appId: "1:1014814260411:web:c7adff1a39026e8fd53d9e",
    measurementId: "G-4HP0L2KV1Q"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
    // 1. Broadcast Ticker
    const saveTickerBtn = document.getElementById("saveTickerBtn");
    if (saveTickerBtn) {
        saveTickerBtn.onclick = async () => {
            const text = document.getElementById("adminTickerInput").value.trim();
            if (!text) return alert("Please enter ticker text.");
            try {
                await db.collection("settings").doc("ticker").set({ text });
                alert("Live banner ticker updated successfully!");
            } catch (e) {
                alert("Error updating ticker.");
            }
        };
    }

    // 2. Promo Code Creator
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

    // 3. User Management (View & Ban/Unban)
    const usersTableBody = document.getElementById("adminUsersTableBody");
    if (usersTableBody) {
        db.collection("users").onSnapshot(snapshot => {
            if (snapshot.empty) {
                usersTableBody.innerHTML = `<tr><td colspan="5" style="padding: 12px; text-align: center; color: #888;">No users registered yet.</td></tr>`;
                return;
            }
            let html = "";
            snapshot.forEach(doc => {
                const u = doc.data();
                html += `
                    <tr style="border-bottom: 1px solid #222;">
                        <td style="padding: 8px;">${u.name || 'N/A'}</td>
                        <td style="padding: 8px;">${u.email || 'N/A'}</td>
                        <td style="padding: 8px; color: var(--neon-purple);">${u.sixDigitId || u.uid.substring(0,6)}</td>
                        <td style="padding: 8px; color: ${u.isBanned ? '#ff0055' : '#00ff66'};">${u.isBanned ? 'BANNED' : 'ACTIVE'}</td>
                        <td style="padding: 8px;">
                            <button onclick="toggleUserBan('${doc.id}', ${!u.isBanned})" style="background: ${u.isBanned ? '#00ff6622' : '#ff005522'}; color: ${u.isBanned ? '#00ff66' : '#ff0055'}; border: 1px solid ${u.isBanned ? '#00ff66' : '#ff0055'}; padding: 3px 8px; border-radius: 4px; cursor: pointer;">
                                ${u.isBanned ? 'Unban' : 'Ban User'}
                            </button>
                        </td>
                    </tr>
                `;
            });
            usersTableBody.innerHTML = html;
        });
    }

    // 4. Live Orders Management
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

window.toggleUserBan = async function(uid, banStatus) {
    let reason = banStatus ? prompt("Enter ban reason for this user:", "Terms violation") : "";
    try {
        await db.collection("users").doc(uid).update({ isBanned: banStatus, banReason: reason });
        alert(`User ${banStatus ? 'Banned' : 'Unbanned'} successfully.`);
    } catch (e) {
        alert("Action failed.");
    }
};

window.updateOrderStatus = async function(orderId, status) {
    try {
        await db.collection("orders").doc(orderId).update({ status });
        alert(`Order ${orderId} marked as ${status}`);
    } catch (e) {
        alert("Failed to update status.");
    }
};
