// ==========================================
// 🔥 YOUR LIVE FIREBASE CONFIGURATION 🔥
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDUowN2gw6HvlBooZw2VDbroabjGhjMlRM",
    authDomain: "cyber-store-b2668.firebaseapp.com",
    projectId: "cyber-store-b2668",
    storageBucket: "cyber-store-b2668.firebasestorage.app",
    messagingSenderId: "1014814260411",
    appId: "1:1014814260411:web:c7adff1a39026e8fd53d9e",
    measurementId: "G-4HP0L2KV1Q"
};
// ==========================================

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
    
    // 3D TAB NAVIGATION LOGIC
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.admin-3d-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        };
    });

    // 1. ORDERS MANAGER (Now showing Free Gifts)
    db.collection("orders").orderBy("createdAt", "desc").onSnapshot(snapshot => {
        const tbody = document.getElementById("adminOrdersTableBody");
        if (snapshot.empty) return tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">No orders found.</td></tr>`;
        let html = "";
        snapshot.forEach(doc => {
            const o = doc.data();
            let c = o.status === 'COMPLETED' ? '#00ff66' : o.status === 'CANCELLED' ? '#ff0055' : '#ffaa00';
            html += `<tr>
                <td>
                    <b style="color:var(--neon-purple);">${o.orderId}</b>
                    ${o.freeGift ? `<br><span style="color:#00ff66; font-size:11px; font-weight:bold;">🎁 ${o.freeGift}</span>` : ''}
                </td>
                <td>${o.phone}</td>
                <td style="font-weight:bold;">Rs. ${o.total}</td>
                <td>${o.utr}</td>
                <td><span class="badge" style="background:${c}22; color:${c}; border-color:${c}; border: 1px solid;">${o.status}</span></td>
                <td style="display:flex; gap:5px;">
                    <button onclick="updateStatus('${o.orderId}', 'COMPLETED')" class="cyber-btn" style="padding:4px 8px; font-size:11px; background:#00ff6622; color:#00ff66;">Done</button>
                    <button onclick="updateStatus('${o.orderId}', 'CANCELLED')" class="cyber-btn" style="padding:4px 8px; font-size:11px; background:#ff005522; color:#ff0055;">Cancel</button>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html;
    });

    // 2. PRODUCTS MANAGER
    db.collection("products").onSnapshot(snapshot => {
        let html = "";
        snapshot.forEach(doc => {
            const p = doc.data();
            html += `<tr>
                <td>${p.name}</td><td>Rs. ${p.price}</td><td>${p.requireEmail ? 'Yes' : 'No'}</td>
                <td><button onclick="deleteProduct('${doc.id}')" class="cyber-btn" style="padding:4px 8px; font-size:11px; background:#ff005522; color:#ff0055;">Delete</button></td>
            </tr>`;
        });
        document.getElementById("adminProductsTableBody").innerHTML = html;
    });

    document.getElementById("saveProductBtn").onclick = async () => {
        const name = document.getElementById("prodName").value.trim();
        const price = parseFloat(document.getElementById("prodPrice").value);
        if (!name || isNaN(price)) return alert("Name and Price required.");
        
        await db.collection("products").doc(name).set({
            name, price,
            iconClass: document.getElementById("prodIcon").value || "fas fa-box",
            iconColor: document.getElementById("prodColor").value || "#ffffff",
            requireEmail: document.getElementById("prodReqEmail").value === "true",
            desc: document.getElementById("prodDesc").value
        });
        alert("Product updated on main store!");
    };

    // 3. USERS, BANS & TARGETED NOTICES
    db.collection("users").onSnapshot(snapshot => {
        let html = "";
        snapshot.forEach(doc => {
            const u = doc.data();
            let isSuspended = u.suspendedUntil && u.suspendedUntil.toDate() > new Date();
            let status = u.isBanned ? 'BANNED' : isSuspended ? 'SUSPENDED' : 'ACTIVE';
            let c = status === 'ACTIVE' ? '#00ff66' : '#ff0055';
            
            html += `<tr>
                <td>${u.name || 'N/A'}</td>
                <td>ID: <b style="color:var(--neon-purple);">${u.sixDigitId || doc.id.substring(0,6)}</b><br><span style="font-size:10px;">${u.email}</span></td>
                <td><span class="badge" style="background:${c}22; color:${c}; border-color:${c}; border:1px solid;">${status}</span></td>
                <td style="display:flex; flex-direction:column; gap:5px;">
                    <button onclick="toggleBan('${doc.id}', ${!u.isBanned})" class="cyber-btn" style="padding:4px; font-size:10px;">${u.isBanned ? 'Unban' : 'Perma-Ban'}</button>
                    ${!u.isBanned ? `<button onclick="suspendUser('${doc.id}')" class="cyber-btn" style="padding:4px; font-size:10px; background:#f59e0b22; color:#f59e0b;">Time Suspend</button>` : ''}
                </td>
                <td><button onclick="sendPersonalNotice('${doc.id}', '${u.name}')" class="cyber-btn" style="padding:4px 8px; font-size:11px; background:#00ff6622; color:#00ff66;">Send Notice</button></td>
            </tr>`;
        });
        document.getElementById("adminUsersTableBody").innerHTML = html;
    });

    // 4. PROMO CODES (Discounts & Free Gifts)
    document.getElementById("savePromoBtn").onclick = async () => {
        const code = document.getElementById("adminPromoCode").value.trim().toUpperCase();
        const discount = parseFloat(document.getElementById("adminPromoDiscount").value) || 0;
        const gift = document.getElementById("adminPromoGift").value.trim();
        const targetId = document.getElementById("adminPromoTargetId").value.trim();
        
        if (!code || (discount === 0 && !gift)) return alert("Code and either a Discount % or a Free Gift are required.");
        
        let promoData = { discountPercent: discount, freeGift: gift };
        if (targetId) promoData.targetSixId = targetId; 
        
        await db.collection("promos").doc(code).set(promoData);
        alert(targetId ? `Promo locked to User ID: ${targetId}` : `Global Promo Created!`);
        
        document.getElementById("adminPromoCode").value = '';
        document.getElementById("adminPromoDiscount").value = '';
        document.getElementById("adminPromoGift").value = '';
        document.getElementById("adminPromoTargetId").value = '';
    };

    // 5. EVENTS & POSTERS
    document.getElementById("saveTickerBtn").onclick = async () => {
        const text = document.getElementById("adminTickerInput").value.trim();
        if (text) await db.collection("settings").doc("ticker").set({ text });
        alert("Poster updated!");
    };
    document.getElementById("saveNoticeBtn").onclick = async () => {
        const title = document.getElementById("adminNoticeTitle").value.trim();
        const text = document.getElementById("adminNoticeText").value.trim();
        if (title && text) await db.collection("settings").doc("globalNotice").set({ title, text, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        alert("Global Notice Sent!");
    };
});

// Admin Global Actions
window.updateStatus = (id, s) => db.collection("orders").doc(id).update({ status: s });
window.deleteProduct = (id) => { if(confirm("Delete Product?")) db.collection("products").doc(id).delete(); };
window.toggleBan = (uid, status) => db.collection("users").doc(uid).update({ isBanned: status, banReason: status ? "Admin Perma-Ban" : "" });
window.suspendUser = async (uid) => {
    let days = parseInt(prompt("Enter days to suspend user:", "7"));
    if (!days) return;
    let d = new Date(); d.setDate(d.getDate() + days);
    await db.collection("users").doc(uid).update({ suspendedUntil: d, banReason: `Suspended for ${days} days` });
};
window.sendPersonalNotice = async (uid, name) => {
    let msg = prompt(`Enter Personal Notice for ${name}:`);
    if (msg) await db.collection("users").doc(uid).update({ personalNotice: msg });
};
