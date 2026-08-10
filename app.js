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
const auth = firebase.auth();

let cart = [];
let activeDiscount = 0;

document.addEventListener("DOMContentLoaded", () => {
    // Load live ticker content safely
    db.collection("settings").doc("ticker").get().then((doc) => {
        if (doc.exists && doc.data().text) {
            const tickerEl = document.getElementById("tickerTextContent");
            if (tickerEl) tickerEl.innerHTML = doc.data().text;
        }
    }).catch(err => console.log("Ticker sync active"));

    // Login / Auth Modal Controls
    const loginBtn = document.getElementById("loginBtn");
    const authModal = document.getElementById("authModal");
    const closeModal = document.getElementById("closeModal");

    if (loginBtn && authModal) {
        loginBtn.onclick = () => authModal.classList.remove("hidden");
    }
    if (closeModal && authModal) {
        closeModal.onclick = () => authModal.classList.add("hidden");
    }

    // Google Login Handler
    const googleLoginBtn = document.getElementById("googleLoginBtn");
    if (googleLoginBtn) {
        googleLoginBtn.onclick = async () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                const result = await auth.signInWithPopup(provider);
                checkUserProfile(result.user);
            } catch (err) {
                alert("Google Login Failed: " + err.message);
            }
        };
    }

    // Email & Password Login / Signup Handler
    const emailPassLoginBtn = document.getElementById("emailPassLoginBtn");
    if (emailPassLoginBtn) {
        emailPassLoginBtn.onclick = async () => {
            const email = document.getElementById("authEmail").value.trim();
            const password = document.getElementById("authPassword").value.trim();
            if (!email || !password) {
                alert("Please enter both email and password.");
                return;
            }
            try {
                let userCred;
                try {
                    userCred = await auth.signInWithEmailAndPassword(email, password);
                } catch (e) {
                    userCred = await auth.createUserWithEmailAndPassword(email, password);
                }
                checkUserProfile(userCred.user);
            } catch (err) {
                alert("Authentication Error: " + err.message);
            }
        };
    }

    // Save Profile Handler
    const saveProfileBtn = document.getElementById("saveProfileBtn");
    if (saveProfileBtn) {
        saveProfileBtn.onclick = async () => {
            const user = auth.currentUser;
            const name = document.getElementById("profileName").value.trim();
            const dob = document.getElementById("profileDob").value;

            if (!name || !dob) {
                alert("Please fill in your name and date of birth.");
                return;
            }

            if (user) {
                const sixDigitId = Math.floor(100000 + Math.random() * 900000).toString();
                await db.collection("users").doc(user.uid).set({
                    uid: user.uid,
                    email: user.email,
                    name,
                    dob,
                    sixDigitId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                alert("Profile saved successfully!");
                if (authModal) authModal.classList.add("hidden");
                location.reload();
            }
        };
    }

    // Cart Modal Controls
    const cartModal = document.getElementById("cartModal");
    const openCartBtn = document.getElementById("openCartBtn");
    const closeCartModal = document.getElementById("closeCartModal");

    if (openCartBtn && cartModal) {
        openCartBtn.onclick = () => {
            if (!auth.currentUser) {
                alert("⚠️ Access Denied: You must Login / Sign Up before viewing your cart!");
                if (authModal) authModal.classList.remove("hidden");
                return;
            }
            cartModal.classList.remove("hidden");
        };
        closeCartModal.onclick = () => cartModal.classList.add("hidden");
    }

    // Instagram Pricing Calculator
    const instaCountInput = document.getElementById("instaCount");
    const instaPriceSpan = document.getElementById("instaPrice");
    if (instaCountInput && instaPriceSpan) {
        instaCountInput.oninput = () => {
            let count = parseInt(instaCountInput.value) || 100;
            let price = (count / 1000) * 60;
            if (count > 1000) price = price * 0.9;
            instaPriceSpan.innerText = Math.round(price);
        };
    }

    // Buy Button Triggers (Strict Login Restriction Enforced)
    document.querySelectorAll(".buy-trigger").forEach(button => {
        button.onclick = (e) => {
            if (!auth.currentUser) {
                alert("🔒 Login Required: Please login or sign up before adding items to your cart!");
                if (authModal) authModal.classList.remove("hidden");
                return;
            }

            const card = e.target.closest(".card");
            const name = card.getAttribute("data-name");
            let price = parseFloat(card.getAttribute("data-price"));
            let details = "";

            if (name === "Spotify Premium") {
                const planSelect = card.querySelector("#spotifyPlan");
                price = parseFloat(planSelect.value);
                details = planSelect.options[planSelect.selectedIndex].text;
            }

            const emailInput = card.querySelector(".user-email-input");
            const email = emailInput ? emailInput.value.trim() : "";
            const requireEmail = card.getAttribute("data-require-email") === "true";

            if (requireEmail && !email) {
                alert("Please enter a valid activation email address.");
                return;
            }

            cart.push({ name, price, details, email });
            updateCartUI();
            if (cartModal) cartModal.classList.remove("hidden");
        };
    });

    // Instagram Boost Buy Trigger
    const instaBuyTrigger = document.getElementById("instaBuyTrigger");
    if (instaBuyTrigger) {
        instaBuyTrigger.onclick = () => {
            if (!auth.currentUser) {
                alert("🔒 Login Required: Please login or sign up first!");
                if (authModal) authModal.classList.remove("hidden");
                return;
            }
            const count = parseInt(document.getElementById("instaCount").value) || 100;
            const username = document.getElementById("instaUsername").value.trim();
            if (!username) {
                alert("Please enter your Instagram username.");
                return;
            }
            let price = (count / 1000) * 60;
            if (count > 1000) price = price * 0.9;

            cart.push({ name: "Instagram Followers", price: Math.round(price), details: `${count} Followers (${username})`, email: username });
            updateCartUI();
            if (cartModal) cartModal.classList.remove("hidden");
        };
    }

    // Safe Promo Code Application (Hardcoded + Firestore Fallback)
    const applyPromoBtn = document.getElementById("applyPromoBtn");
    if (applyPromoBtn) {
        applyPromoBtn.onclick = async () => {
            const code = document.getElementById("promoCodeInput").value.trim().toUpperCase();
            const feedback = document.getElementById("promoFeedback");
            if (!code) return;

            // Hardcoded fallback codes for instant responsiveness
            const fallbackCoupons = { "CYBER10": 10, "WELCOME50": 50, "CYBER20": 20 };

            if (fallbackCoupons[code] !== undefined) {
                activeDiscount = fallbackCoupons[code];
                feedback.style.color = "var(--success-color)";
                feedback.innerText = `Promo applied! ${activeDiscount}% OFF`;
                updateCartUI();
                return;
            }

            try {
                const doc = await db.collection("promos").doc(code).get();
                if (doc.exists) {
                    activeDiscount = doc.data().discountPercent || 0;
                    feedback.style.color = "var(--success-color)";
                    feedback.innerText = `Promo applied! ${activeDiscount}% OFF`;
                    updateCartUI();
                } else {
                    feedback.style.color = "var(--danger-color)";
                    feedback.innerText = "Invalid or expired promo code.";
                }
            } catch (e) {
                feedback.style.color = "var(--danger-color)";
                feedback.innerText = "Error applying code. Try CYBER10 or WELCOME50.";
            }
        };
    }

    // Proceed to Checkout
    const proceedBtn = document.getElementById("proceedToCheckoutBtn");
    const paymentModal = document.getElementById("paymentModal");
    if (proceedBtn && paymentModal) {
        proceedBtn.onclick = () => {
            if (cart.length === 0) {
                alert("Your cart is empty!");
                return;
            }
            if (cartModal) cartModal.classList.add("hidden");
            paymentModal.classList.remove("hidden");
        };
    }

    const closePaymentModal = document.getElementById("closePaymentModal");
    if (closePaymentModal && paymentModal) {
        closePaymentModal.onclick = () => paymentModal.classList.add("hidden");
    }

    // Submit Order
    const submitOrderBtn = document.getElementById("submitOrderBtn");
    if (submitOrderBtn) {
        submitOrderBtn.onclick = async () => {
            const phone = document.getElementById("customerPhone").value.trim();
            const utr = document.getElementById("utrInput").value.trim();

            if (!phone || phone.length !== 10) {
                alert("Please enter a valid 10-digit Indian mobile number.");
                return;
            }
            if (!utr || utr.length < 10) {
                alert("Please enter a valid UTR / Transaction ID.");
                return;
            }

            const orderId = "#ORDER" + Math.floor(100000 + Math.random() * 900000);
            const total = calculateTotal();

            const orderData = {
                orderId,
                userUid: auth.currentUser ? auth.currentUser.uid : "guest",
                phone,
                utr,
                items: cart,
                total,
                status: "PENDING",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                await db.collection("orders").doc(orderId).set(orderData);
                alert(`Order submitted successfully! Your Order ID is ${orderId}. Keep this safe for status tracking.`);
                cart = [];
                updateCartUI();
                if (paymentModal) paymentModal.classList.add("hidden");
            } catch (err) {
                alert("Error submitting order. Please try again.");
            }
        };
    }

    // Update Login Button UI based on Auth State
    auth.onAuthStateChanged(user => {
        const loginBtnEl = document.getElementById("loginBtn");
        if (user) {
            db.collection("users").doc(user.uid).get().then(doc => {
                if (doc.exists && doc.data().isBanned) {
                    const bannedOverlay = document.getElementById("bannedOverlay");
                    const reason = doc.data().banReason || "Your account has been restricted.";
                    document.getElementById("bannedReasonText").innerText = reason;
                    if (bannedOverlay) bannedOverlay.style.display = "flex";
                } else if (loginBtnEl && doc.exists) {
                    loginBtnEl.innerText = `👤 ${doc.data().name || 'Account'}`;
                    loginBtnEl.onclick = () => {
                        auth.signOut().then(() => location.reload());
                    };
                }
            });
        }
    });
});

async function checkUserProfile(user) {
    const doc = await db.collection("users").doc(user.uid).get();
    const authModal = document.getElementById("authModal");
    if (!doc.exists || !doc.data().name) {
        document.getElementById("loginStep").classList.add("hidden");
        document.getElementById("profileStep").classList.remove("hidden");
        document.getElementById("modalTitle").innerText = "Complete Profile";
    } else {
        if (authModal) authModal.classList.add("hidden");
        location.reload();
    }
}

function calculateTotal() {
    let subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    let total = subtotal - (subtotal * (activeDiscount / 100));
    return Math.max(0, Math.round(total));
}

function updateCartUI() {
    const container = document.getElementById("cartItemsContainer");
    const badge = document.getElementById("cartBadge");
    const subtotalEl = document.getElementById("cartSubtotal");
    const totalEl = document.getElementById("cartTotalPrice");

    if (badge) badge.innerText = cart.length;

    if (container) {
        if (cart.length === 0) {
            container.innerHTML = `<p style="color: #888;">Your cart is empty.</p>`;
        } else {
            container.innerHTML = cart.map((item, index) => `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 5px;">
                    <div>
                        <b>${item.name}</b> ${item.details ? `(${item.details})` : ''}
                        <br><span style="font-size: 11px; color: #aaa;">Rs. ${item.price}</span>
                    </div>
                    <button onclick="removeFromCart(${index})" style="background:none; border:none; color:var(--danger-color); cursor:pointer;"><i class="fas fa-trash"></i></button>
                </div>
            `).join('');
        }
    }

    let subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    let total = calculateTotal();

    if (subtotalEl) subtotalEl.innerText = `Rs. ${subtotal}`;
    if (totalEl) totalEl.innerText = total;
}

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    updateCartUI();
};
