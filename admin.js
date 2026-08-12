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
    
    // 1. Poster / Ticker Management
    const saveTickerBtn = document.getElementById("saveTickerBtn");
    if (saveTickerBtn) {
        saveTickerBtn.onclick = async () => {
            const text = document.getElementById("adminTickerInput").value.trim();
            if (!text) return alert("Please enter the poster/ticker text.");
            try {
                await db.collection("settings").doc("ticker").set({ text });
                alert("Live poster updated successfully!");
                document.getElementById("adminTickerInput").value = '';
            } catch (e) {
                alert("Error updating ticker: " + e.message);
            }
        };
    }

    // 2. Global Notice Management
    const saveNoticeBtn = document.getElementById("saveNoticeBtn");
    if (saveNoticeBtn) {
        saveNoticeBtn.onclick = async () => {
            const title = document.getElementById("adminNoticeTitle").value.trim();
            const text = document.getElementById("adminNoticeText").value.trim();
            if (!title || !text) return alert("Please enter both Notice Title and Text.");
            try {
                await db.collection("settings").doc("globalNotice").set({ 
                    title: title, 
                    text: text, 
                    timestamp: firebase.firestore.FieldValue.serverTimestamp() 
                });
                alert("Global Notice Broadcasted Successfully!");
                document.getElementById("adminNoticeTitle").value = '';
                document.getElementById("adminNoticeText").value = '';
            } catch (e) {
                alert("Error broadcasting notice: " + e.message);
            }
        };
    }

    // 3. Promo Code Management
    const savePromoBtn = document.getElementById("savePromoBtn");
    if (savePromoBtn) {
        savePromoBtn.onclick = async () => {
            const code = document.getElementById("adminPromoCode").value.trim().toUpperCase();
            const discountPercent = parseFloat(document.getElementById("adminPromoDiscount").value);
            if (!code || isNaN(discountPercent)) return alert("Enter valid code and discount percentage.");
            try {
                await db.collection("promos").doc(code).set({ discountPercent });
                alert(`Promo code ${code} saved successfully!`);
                document.getElementById("adminPromoCode").value = '';
                document.getElementById("adminPromoDiscount").value = '';
            } catch (e) {
                alert("Error saving promo code: " + e.message);
            }
        };
    }

    // 4. User Ban & Suspend Management (FIXED DATA LOADING)
    const usersTableBody = document.getElementById("adminUsersTableBody");
    if (usersTableBody) {
        // Removed orderBy to prevent Firebase Index failures
        db.collection("users").onSnapshot(snapshot => {
            if (snapshot.empty) {
                usersTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #888;">No users registered yet.</td></tr>`;
                return;
            }
            let html = "";
            snapshot.forEach(doc => {
                const u = doc.data();
                html += `
                    <tr>
                        <td>${u.name || 'N/A'}</td>
                        <td>${u.email || 'N/A'}</td>
                        <td style="font-weight:bold;">${u.sixDigitId || doc.id.substring(0,6)}</td>
                        <td><span class="badge ${u.isBanned ? 'badge-banned' : 'badge-active'}">${u.isBanned ? 'BANNED' : 'ACTIVE'}</span></td>
                        <td>
                            <button onclick="toggleUserBan('${doc.id}', ${!u.isBanned})" class="btn-inline ${u.isBanned ? 'btn-success' : 'btn-danger'}">
                                ${u.isBanned ? 'Unban User' : 'Ban User'}
                            </button>
                        </td>
                    </tr>
                `;
            });
            usersTableBody.innerHTML = html;
        }, error => {
            usersTableBody.innerHTML = `<tr><td colspan="5" style="color: #ef4444; text-align: center;">Error loading users: ${error.message}</td></tr>`;
        });
    }

    // 5. Live Orders Management (FIXED DATA LOADING)
    const ordersTableBody = document.getElementById("adminOrdersTableBody");
    if (ordersTableBody) {
        // Removed orderBy to prevent Firebase Index failures
        db.collection("orders").onSnapshot(snapshot => {
            if (snapshot.empty) {
                ordersTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #888;">No orders found.</td></tr>`;
                return;
            }
            let html = "";
            snapshot.forEach(doc => {
                const order = doc.data();
                
                let badgeClass = 'badge-pending';
                if (order.status === 'COMPLETED') badgeClass = 'badge-active';
                if (order.status === 'CANCELLED') badgeClass = 'badge-banned';
                
                html += `
                    <tr>
                        <td style="font-weight: bold;">${order.orderId}</td>
                        <td>${order.phone}</td>
                        <td style="font-weight: bold;">Rs. ${order.total}</td>
                        <td>${order.utr}</td>
                        <td><span class="badge ${badgeClass}">${order.status}</span></td>
                        <td style="display: flex; gap: 5px;">
                            <button onclick="updateOrderStatus('${order.orderId}', 'COMPLETED')" class="btn-inline btn-success">Complete</button>
                            <button onclick="updateOrderStatus('${order.orderId}', 'CANCELLED')" class="btn-inline btn-danger">Cancel</button>
                        </td>
                    </tr>
                `;
            });
            ordersTableBody.innerHTML = html;
        }, error => {
            ordersTableBody.innerHTML = `<tr><td colspan="6" style="color: #ef4444; text-align: center;">Error loading orders: ${error.message}</td></tr>`;
        });
    }
});

// Admin Global Functions
window.toggleUserBan = async function(uid, banStatus) {
    let reason = "";
    if (banStatus) {
        reason = prompt("You are about to BAN a user. Enter the reason:", "Admin Decision");
        if (reason === null) return; 
    }
    
    try {
        await db.collection("users").doc(uid).update({ 
            isBanned: banStatus, 
            banReason: reason 
        });
    } catch (e) {
        alert("Failed to update user status: " + e.message);
    }
};

window.updateOrderStatus = async function(orderId, status) {
    try {
        await db.collection("orders").doc(orderId).update({ status });
    } catch (e) {
        alert("Failed to update order status: " + e.message);
    }
};
