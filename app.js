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
                alert("✅ Live poster ticker updated successfully!");
                document.getElementById("adminTickerInput").value = '';
            } catch (e) {
                alert("❌ Error updating ticker.");
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
                // This triggers the #cyberMsgModal on the main website
                await db.collection("settings").doc("globalNotice").set({ 
                    title: title, 
                    text: text, 
                    timestamp: firebase.firestore.FieldValue.serverTimestamp() 
                });
                alert("✅ Global Notice Broadcasted Successfully!");
                document.getElementById("adminNoticeTitle").value = '';
                document.getElementById("adminNoticeText").value = '';
            } catch (e) {
                alert("❌ Error broadcasting notice.");
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
                alert(`✅ Promo code ${code} saved successfully!`);
                document.getElementById("adminPromoCode").value = '';
                document.getElementById("adminPromoDiscount").value = '';
            } catch (e) {
                alert("❌ Error saving promo code.");
            }
        };
    }

    // 4. User Ban & Suspend Management
    const usersTableBody = document.getElementById("adminUsersTableBody");
    if (usersTableBody) {
        db.collection("users").orderBy("createdAt", "desc").onSnapshot(snapshot => {
            if (snapshot.empty) {
                usersTableBody.innerHTML = `<tr><td colspan="5" style="padding: 12px; text-align: center; color: #888;">No users registered yet.</td></tr>`;
                return;
            }
            let html = "";
            snapshot.forEach(doc => {
                const u = doc.data();
                html += `
                    <tr style="border-bottom: 1px solid #222; background: ${u.isBanned ? 'rgba(255,0,85,0.05)' : 'transparent'};">
                        <td style="padding: 10px;">${u.name || 'N/A'}</td>
                        <td style="padding: 10px;">${u.email || 'N/A'}</td>
                        <td style="padding: 10px; color: var(--neon-purple); font-weight:bold;">${u.sixDigitId || doc.id.substring(0,6)}</td>
                        <td style="padding: 10px; font-weight: bold; color: ${u.isBanned ? '#ff0055' : '#00ff66'};">${u.isBanned ? 'SUSPENDED' : 'ACTIVE'}</td>
                        <td style="padding: 10px;">
                            <button onclick="toggleUserBan('${doc.id}', ${!u.isBanned})" class="cyber-btn" style="background: ${u.isBanned ? '#00ff6622' : '#ff005522'}; color: ${u.isBanned ? '#00ff66' : '#ff0055'}; border: 1px solid ${u.isBanned ? '#00ff66' : '#ff0055'}; padding: 6px 12px; font-size: 11px;">
                                ${u.isBanned ? 'Unban User' : 'Suspend / Ban'}
                            </button>
                        </td>
                    </tr>
                `;
            });
            usersTableBody.innerHTML = html;
        });
    }

    // 5. Live Orders Management
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
                let statusColor = order.status === 'COMPLETED' ? '#00ff66' : order.status === 'CANCELLED' ? '#ff0055' : '#ffaa00';
                
                html += `
                    <tr style="border-bottom: 1px solid #222;">
                        <td style="padding: 12px; color: var(--neon-purple); font-weight: bold; font-size: 14px;">${order.orderId}</td>
                        <td style="padding: 12px;">${order.phone}</td>
                        <td style="padding: 12px; font-weight: bold;">Rs. ${order.total}</td>
                        <td style="padding: 12px; color: #d1c4e9;">${order.utr}</td>
                        <td style="padding: 12px;"><span style="padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor};">${order.status}</span></td>
                        <td style="padding: 12px; display: flex; gap: 8px;">
                            <button onclick="updateOrderStatus('${order.orderId}', 'COMPLETED')" class="cyber-btn" style="background:#00ff6622; color:#00ff66; border-color:#00ff66; padding: 5px 10px; font-size:11px;">Complete</button>
                            <button onclick="updateOrderStatus('${order.orderId}', 'CANCELLED')" class="cyber-btn" style="background:#ff005522; color:#ff0055; border-color:#ff0055; padding: 5px 10px; font-size:11px;">Cancel</button>
                        </td>
                    </tr>
                `;
            });
            ordersTableBody.innerHTML = html;
        });
    }
});

// Admin Global Functions
window.toggleUserBan = async function(uid, banStatus) {
    let reason = "";
    if (banStatus) {
        reason = prompt("⚠️ You are about to BAN a user. Enter the reason (e.g., Fraud, Terms Violation):", "Account Suspended by Admin");
        if (reason === null) return; // Admin cancelled the prompt
    }
    
    try {
        await db.collection("users").doc(uid).update({ 
            isBanned: banStatus, 
            banReason: reason 
        });
        // Feedback is automatic via the onSnapshot listener above
    } catch (e) {
        alert("❌ Failed to update user status.");
    }
};

window.updateOrderStatus = async function(orderId, status) {
    try {
        await db.collection("orders").doc(orderId).update({ status });
        // Feedback is automatic via the onSnapshot listener above
    } catch (e) {
        alert("❌ Failed to update order status.");
    }
};
