// Login Page JavaScript
class LoginManager {
    constructor() {
        this.supabase = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        this.currentForm = 'login';
        this.isRecoverySession = false;
        this.initializeLogin();
        
        // Listen for auth state changes (e.g., when password reset token is processed)
        this.supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && window.location.hash.includes('type=recovery'))) {
                this.isRecoverySession = true;
                this.showPasswordChangeForm();
            }
        });
    }

    initializeLogin() {
        // Form elements
        this.loginForm = document.getElementById('loginForm');
        this.signupForm = document.getElementById('signupForm');
        this.resetForm = document.getElementById('resetForm');
        
        // Buttons
        this.loginBtn = document.getElementById('loginBtn');
        this.signupBtn = document.getElementById('signupBtn');
        this.resetBtn = document.getElementById('resetBtn');
        
        // Switch elements
        this.switchText = document.getElementById('switchText');
        this.switchToSignup = document.getElementById('switchToSignup');
        this.forgotPassword = document.getElementById('forgotPassword');
        
        // Messages
        this.errorMessage = document.getElementById('errorMessage');
        this.successMessage = document.getElementById('successMessage');
        
        // Event listeners
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        this.resetForm.addEventListener('submit', (e) => this.handlePasswordReset(e));
        
        this.switchToSignup.addEventListener('click', (e) => this.switchToSignupForm(e));
        this.forgotPassword.addEventListener('click', (e) => this.switchToResetForm(e));
        
        // Check for password reset token in URL
        this.checkPasswordResetToken();
        
        // Check if user is already logged in
        this.checkExistingSession();
    }

    async checkPasswordResetToken() {
        const urlHash = window.location.hash;
        if (urlHash.includes('type=recovery') || urlHash.includes('access_token')) {
            // Wait a moment for Supabase to process the hash
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Check if we have a recovery session
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session) {
                this.isRecoverySession = true;
                this.showPasswordChangeForm();
            }
        }
    }

    showPasswordChangeForm() {
        // Hide all forms
        this.loginForm.style.display = 'none';
        this.signupForm.style.display = 'none';
        this.resetForm.style.display = 'none';
        
        // Create password change form if it doesn't exist
        let passwordChangeForm = document.getElementById('passwordChangeForm');
        if (!passwordChangeForm) {
            passwordChangeForm = document.createElement('form');
            passwordChangeForm.id = 'passwordChangeForm';
            passwordChangeForm.innerHTML = `
                <div class="form-group">
                    <label for="newPassword">New Password:</label>
                    <input type="password" id="newPassword" name="new-password" autocomplete="new-password" required>
                </div>
                <div class="form-group">
                    <label for="confirmNewPassword">Confirm New Password:</label>
                    <input type="password" id="confirmNewPassword" name="confirm-password" autocomplete="new-password" required>
                </div>
                <button type="submit" id="changePasswordBtn" class="auth-btn">Change Password</button>
            `;
            this.loginForm.parentNode.insertBefore(passwordChangeForm, this.loginForm);
            
            passwordChangeForm.addEventListener('submit', (e) => this.handlePasswordChange(e));
        }
        
        passwordChangeForm.style.display = 'block';
        this.switchText.innerHTML = '<p>Enter your new password below</p>';
        this.clearMessages();
    }

    async handlePasswordChange(e) {
        e.preventDefault();
        console.log('Password change form submitted');
        
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;
        
        if (newPassword !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }
        
        if (newPassword.length < 6) {
            this.showError('Password must be at least 6 characters');
            return;
        }
        
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        this.setButtonLoading(changePasswordBtn, true);
        this.clearMessages();
        
        try {
            // Check if we have a session
            const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
            
            if (sessionError || !session) {
                console.error('Session error:', sessionError);
                throw new Error('Invalid or expired reset link. Please request a new password reset.');
            }
            
            // Update the password
            const { error: updateError } = await this.supabase.auth.updateUser({
                password: newPassword
            });
            
            if (updateError) {
                console.error('Password update error:', updateError);
                throw updateError;
            }
            
            console.log('Password changed successfully');
            this.showSuccess('Password changed successfully! You can now login with your new password.');
            
            // Reset the recovery session flag and clear URL hash
            this.isRecoverySession = false;
            
            // Clear the URL hash and show login form after a short delay
            setTimeout(() => {
                window.location.hash = '';
                window.history.replaceState(null, '', 'login.html');
                this.switchToLoginForm({ preventDefault: () => {} });
                
                // Sign out to clear the recovery session
                this.supabase.auth.signOut();
            }, 1500);
            
        } catch (error) {
            console.error('Password change failed:', error);
            this.showError(error.message || 'Failed to change password. The reset link may have expired.');
        } finally {
            this.setButtonLoading(changePasswordBtn, false);
        }
    }

    async checkExistingSession() {
        // Don't redirect if we're handling a password reset
        const urlHash = window.location.hash;
        if (urlHash.includes('type=recovery') || urlHash.includes('access_token') || this.isRecoverySession) {
            return;
        }
        
        const { data: { session } } = await this.supabase.auth.getSession();
        if (session) {
            // User is already logged in, redirect to main app
            window.location.href = 'index.html';
        }
    }

    switchToSignupForm(e) {
        e.preventDefault();
        this.currentForm = 'signup';
        this.loginForm.style.display = 'none';
        this.signupForm.style.display = 'block';
        this.resetForm.style.display = 'none';
        this.switchText.innerHTML = 'Already have an account? <a href="#" id="switchToLogin">Login</a>';
        this.clearMessages();
        
        // Update event listener
        document.getElementById('switchToLogin').addEventListener('click', (e) => this.switchToLoginForm(e));
    }

    switchToLoginForm(e) {
        e.preventDefault();
        this.currentForm = 'login';
        this.isRecoverySession = false;
        this.loginForm.style.display = 'block';
        this.signupForm.style.display = 'none';
        this.resetForm.style.display = 'none';
        
        // Hide password change form if it exists
        const passwordChangeForm = document.getElementById('passwordChangeForm');
        if (passwordChangeForm) {
            passwordChangeForm.style.display = 'none';
        }
        
        this.switchText.innerHTML = 'Don\'t have an account? <a href="#" id="switchToSignup">Sign up</a>';
        this.clearMessages();
        
        // Update event listener
        document.getElementById('switchToSignup').addEventListener('click', (e) => this.switchToSignupForm(e));
    }

    switchToResetForm(e) {
        e.preventDefault();
        this.currentForm = 'reset';
        this.loginForm.style.display = 'none';
        this.signupForm.style.display = 'none';
        this.resetForm.style.display = 'block';
        this.switchText.innerHTML = '<a href="#" id="backToLogin">Back to Login</a>';
        this.clearMessages();
        
        // Update event listener
        document.getElementById('backToLogin').addEventListener('click', (e) => this.switchToLoginForm(e));
    }

    async handleLogin(e) {
        e.preventDefault();
        console.log('Login form submitted');
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        this.setButtonLoading(this.loginBtn, true);
        this.clearMessages();
        
        try {
            console.log('Attempting login with:', email);
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) {
                console.error('Login error:', error);
                throw error;
            }
            
            console.log('Login successful:', data);
            this.showSuccess('Login successful! Redirecting...');
            
            // Redirect to main app after a short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
            
        } catch (error) {
            console.error('Login failed:', error);
            this.showError(error.message);
        } finally {
            this.setButtonLoading(this.loginBtn, false);
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        console.log('Signup form submitted');
        
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }
        
        if (password.length < 6) {
            this.showError('Password must be at least 6 characters');
            return;
        }
        
        this.setButtonLoading(this.signupBtn, true);
        this.clearMessages();
        
        try {
            console.log('Attempting signup with:', email);
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password
            });
            
            if (error) {
                console.error('Signup error:', error);
                throw error;
            }
            
            console.log('Signup successful:', data);
            
            if (data.user && !data.user.email_confirmed_at) {
                this.showSuccess('Account created! Please check your email to confirm your account.');
            } else {
                this.showSuccess('Account created successfully! You can now login.');
                this.switchToLoginForm({ preventDefault: () => {} });
            }
            
        } catch (error) {
            console.error('Signup failed:', error);
            this.showError(error.message);
        } finally {
            this.setButtonLoading(this.signupBtn, false);
        }
    }

    async handlePasswordReset(e) {
        e.preventDefault();
        console.log('Password reset form submitted');
        
        const email = document.getElementById('resetEmail').value;
        
        this.setButtonLoading(this.resetBtn, true);
        this.clearMessages();
        
        try {
            console.log('Attempting password reset for:', email);
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/login.html`
            });
            
            if (error) {
                console.error('Password reset error:', error);
                throw error;
            }
            
            console.log('Password reset email sent');
            this.showSuccess('Password reset email sent! Check your inbox and click the link to reset your password.');
            
        } catch (error) {
            console.error('Password reset failed:', error);
            this.showError(error.message);
        } finally {
            this.setButtonLoading(this.resetBtn, false);
        }
    }

    setButtonLoading(button, loading) {
        if (loading) {
            button.disabled = true;
            button.textContent = 'Loading...';
        } else {
            button.disabled = false;
            if (button === this.loginBtn) {
                button.textContent = 'Login';
            } else if (button === this.signupBtn) {
                button.textContent = 'Sign Up';
            } else if (button === this.resetBtn) {
                button.textContent = 'Send Reset Email';
            } else if (button && button.id === 'changePasswordBtn') {
                button.textContent = 'Change Password';
            }
        }
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
        this.successMessage.style.display = 'none';
    }

    showSuccess(message) {
        this.successMessage.textContent = message;
        this.successMessage.style.display = 'block';
        this.errorMessage.style.display = 'none';
    }

    clearMessages() {
        this.errorMessage.style.display = 'none';
        this.successMessage.style.display = 'none';
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});
