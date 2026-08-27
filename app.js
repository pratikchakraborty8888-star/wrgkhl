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

    // 1. ORDERS MANAGER (Added Paid, Pending, Complete, Cancel)
    db.collection("orders").orderBy("createdAt", "desc").onSnapshot(snapshot => {
        const tbody = document.getElementById("adminOrdersTableBody");
        if (snapshot.empty) return tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">No orders found.</td></tr>`;
        let html = "";
        snapshot.forEach(doc => {
            const o = doc.data();
            // High-End Status Coloring
            let c = '#ffaa00'; // Default Pending
            if (o.status === 'COMPLETED') c = '#00ff66';
            if (o.status === 'CANCELLED') c = '#ff0055';
            if (o.status === 'PAID') c = '#00ccff';
            
            html += `<tr>
                <td>
                    <b style="color:var(--neon-purple); font-size:14px;">${o.orderId}</b>
                    ${o.freeGift ? `<br><span style="color:#00ff66; font-size:11px; font-weight:bold;">🎁 ${o.freeGift}</span>` : ''}
                </td>
                <td style="color:#ccc;">${o.phone}</td>
                <td style="font-weight:bold; font-size:14px;">Rs. ${o.total}</td>
                <td style="font-family:monospace; color:#aaa;">${o.utr}</td>
                <td><span class="badge" style="background:${c}22; color:${c}; border: 1px solid ${c}; text-shadow: 0 0 5px ${c}55;">${o.status}</span></td>
                <td style="display:flex; flex-wrap:wrap; gap:6px; max-width: 180px;">
                    <button onclick="updateStatus('${o.orderId}', 'PAID')" class="cyber-btn" style="padding:5px 8px; font-size:10px; background:#00ccff22; color:#00ccff; border-color:#00ccff;">Paid</button>
                    <button onclick="updateStatus('${o.orderId}', 'PENDING')" class="cyber-btn" style="padding:5px 8px; font-size:10px; background:#ffaa0022; color:#ffaa00; border-color:#ffaa00;">Pending</button>
                    <button onclick="updateStatus('${o.orderId}', 'COMPLETED')" class="cyber-btn" style="padding:5px 8px; font-size:10px; background:#00ff6622; color:#00ff66; border-color:#00ff66;">Complete</button>
                    <button onclick="updateStatus('${o.orderId}', 'CANCELLED')" class="cyber-btn" style="padding:5px 8px; font-size:10px; background:#ff005522; color:#ff0055; border-color:#ff0055;">Cancel</button>
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
                <td style="font-weight:bold; font-size:14px;">${p.name}</td>
                <td style="color:var(--neon-purple);">Rs. ${p.price}</td>
                <td style="color:#aaa;">${p.requireEmail ? 'Yes' : 'No'}</td>
                <td><button onclick="deleteProduct('${doc.id}')" class="cyber-btn" style="padding:6px 12px; font-size:11px; background:#ff005522; color:#ff0055;">Remove</button></td>
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
        alert("Product deployed to live storefront!");
    };

    // 3. USERS, BANS & TARGETED NOTICES
    db.collection("users").onSnapshot(snapshot => {
        let html = "";
        snapshot.forEach(doc => {
            const u = doc.data();
            let isSuspended = u.suspendedUntil && u.suspendedUntil.toDate() > new Date();
            let status = u.isBanned ? 'BANNED' : isSuspended ? 'SUSPENDED' : 'ACTIVE';
            let c = status === 'ACTIVE' ? '#00ff66' : '#ff0055';
            
            html += `<tr style="background: ${status !== 'ACTIVE' ? 'rgba(255,0,85,0.05)' : 'transparent'};">
                <td style="font-weight:bold;">${u.name || 'N/A'}</td>
                <td>ID: <b style="color:var(--neon-purple);">${u.sixDigitId || doc.id.substring(0,6)}</b><br><span style="font-size:11px; color:#aaa;">${u.email}</span></td>
                <td><span class="badge" style="background:${c}22; color:${c}; border:1px solid ${c};">${status}</span></td>
                <td style="display:flex; flex-direction:column; gap:6px;">
                    <button onclick="toggleBan('${doc.id}', ${!u.isBanned})" class="cyber-btn" style="padding:5px; font-size:10px;">${u.isBanned ? 'Revoke Ban' : 'Permanent Ban'}</button>
                    ${!u.isBanned ? `<button onclick="suspendUser('${doc.id}')" class="cyber-btn" style="padding:5px; font-size:10px; background:#f59e0b22; color:#f59e0b; border-color:#f59e0b;">Time Suspend</button>` : ''}
                </td>
                <td><button onclick="sendPersonalNotice('${doc.id}', '${u.name}')" class="cyber-btn" style="padding:8px 12px; font-size:11px; background:#00ccff22; color:#00ccff; border-color:#00ccff;">Send Private Notice</button></td>
            </tr>`;
        });
        document.getElementById("adminUsersTableBody").innerHTML = html;
    });

    // 4. PROMO CODES
    document.getElementById("savePromoBtn").onclick = async () => {
        const code = document.getElementById("adminPromoCode").value.trim().toUpperCase();
        const discount = parseFloat(document.getElementById("adminPromoDiscount").value) || 0;
        const gift = document.getElementById("adminPromoGift").value.trim();
        const targetId = document.getElementById("adminPromoTargetId").value.trim();
        
        if (!code || (discount === 0 && !gift)) return alert("Provide a Code and either a Discount % or a Free Gift.");
        
        let promoData = { discountPercent: discount, freeGift: gift };
        if (targetId) promoData.targetSixId = targetId; 
        
        await db.collection("promos").doc(code).set(promoData);
        alert(targetId ? `Targeted Promo generated for User ID: ${targetId}` : `Global Promo generated!`);
        
        document.getElementById("adminPromoCode").value = '';
        document.getElementById("adminPromoDiscount").value = '';
        document.getElementById("adminPromoGift").value = '';
        document.getElementById("adminPromoTargetId").value = '';
    };

    // 5. EVENTS & POSTERS
    document.getElementById("saveTickerBtn").onclick = async () => {
        const text = document.getElementById("adminTickerInput").value.trim();
        if (text) await db.collection("settings").doc("ticker").set({ text });
        alert("Live Header Updated!");
    };
    document.getElementById("saveNoticeBtn").onclick = async () => {
        const title = document.getElementById("adminNoticeTitle").value.trim();
        const text = document.getElementById("adminNoticeText").value.trim();
        if (title && text) await db.collection("settings").doc("globalNotice").set({ title, text, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        alert("System Alert Broadcasted!");
    };
});

// Admin Global Actions
window.updateStatus = (id, s) => db.collection("orders").doc(id).update({ status: s });
window.deleteProduct = (id) => { if(confirm("Are you sure you want to remove this product from the storefront?")) db.collection("products").doc(id).delete(); };
window.toggleBan = (uid, status) => db.collection("users").doc(uid).update({ isBanned: status, banReason: status ? "Admin Perma-Ban" : "" });
window.suspendUser = async (uid) => {
    let days = parseInt(prompt("Enter days to suspend user account:", "7"));
    if (!days) return;
    let d = new Date(); d.setDate(d.getDate() + days);
    await db.collection("users").doc(uid).update({ suspendedUntil: d, banReason: `Suspended for ${days} days` });
};
window.sendPersonalNotice = async (uid, name) => {
    let msg = prompt(`Enter Secure Notice for ${name}:`);
    if (msg) await db.collection("users").doc(uid).update({ personalNotice: msg });
};
