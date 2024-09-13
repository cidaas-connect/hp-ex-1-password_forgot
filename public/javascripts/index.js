// ## Common Javascript functionality to get started:
//
// # Read url parameter
// const x = urlParams.get('x');
//
// # Get html element
// const errorMessage = document.getElementById('error-message');
//
// # Set text content
// errorMessage.textContent = 'Nothing to see here.';
//
// # Disable element 
// resetButton.disabled = true;
//
// # Add / Remove css class
// errorMessage.classList.add('hidden');
// errorMessage.classList.remove('hidden');
//
// # Add event listener for Cancel button
// cancelButton.addEventListener('click', function() {
//     doSomething();
// });
//
// # Http fetch:
// fetch(url, {
//     method: 'POST',
//     headers: {
//         'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({
//         a: "b"
//     })
// })
//     .then(response => {
//         if (response.ok) {
//             let json = response.json();
//             doSomethingWithJson(json);
//         } else {
//             console.error('Something went wrong');
//         }
//     })
//     .catch(error => {
//         console.error('Error:', error);
//     });
//
// # Set global css variables:
// document.documentElement.style.setProperty('--form-border-color', data.data.accentColor);
//
// # Basepath: https://connect-prod.cidaas.eu

document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const requestId = urlParams.get('requestId');
    const userIdHint = urlParams.get('userIdHint');

    const errorMessage = document.getElementById('error-message');
    const emailDisplay = document.getElementById('email-display');
    const emailForm = document.getElementById('email-form');
    const userEmail = document.getElementById('user-email');
    const emailInput = document.getElementById('email-input');
    const resetButton = document.getElementById('reset-button');
    const cancelButton = document.getElementById('cancel-button');

    /*
        Step 1:

        Load & check that the requestId is set in the browser URL.

        Javascript function: urlParams.get('');
        If it is not set, display error message in errorMessage.textContent = ''
    */
    if (!requestId) {
        errorMessage.textContent = 'Error: requestId is missing from the URL.';
        errorMessage.classList.remove('hidden');
        resetButton.disabled = true;
        cancelButton.textContent = 'Back to login'
        emailForm.classList.add('hidden');
    } else {
        /*
            Optional Step 9:

            upon page load, load the styling information from the server.
            loadStylingInformation(requesId)
        */
        loadStylingInformation(requestId);
    }

    /*
        Step 2: 

        Load & display the userIdHint if it is set in the browser URL.
        If it is not set, display the email form.
    */
    if (userIdHint) {
        userEmail.textContent = userIdHint;
        emailDisplay.classList.remove('hidden');
    } else {
        emailForm.classList.remove('hidden');
    }

    /*
        Step 3:

        On click of the reset button, trigger the resetPassword function.
        Optional: Check that the email is set.
    */
    resetButton.addEventListener('click', function () {
        const email = userIdHint || emailInput.value;
        if (!email) {
            errorMessage.textContent = 'Please enter an email address.';
            errorMessage.classList.remove('hidden');
            return;
        }

        // Placeholder for the actual reset function
        resetPassword(requestId, email);
    });

    /*
        Step 6:

        On submit of the verificationForm, check that the verification code is set, before submitting the form.
    */
    const verificationForm = document.getElementById('verification-form');
    verificationForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const code = document.getElementById('verification-input').value;
        if (!code) {
            errorMessage.textContent = 'Please enter the verification code.';
            errorMessage.classList.remove('hidden');
            return;
        }
        this.submit();
    });

    /*
        Step 7:

        cidaas redirects back to the same hosted page with an error query parameter if something went wrong.
        If this error message is in the url, display it in errorMessage.

        We want to show some nice user friendly message if the code is wrong.
        In all other scenarios, the display of the error_description can be done.

        // 7.1: If the rprq is set, show the verificationCodeInputForm, to let the user retry.
    */
    if (urlParams.get('error') != null) {
        errorMessage.classList.remove('hidden');
        if (urlParams.get('error') == "invalid_code") {
            errorMessage.textContent = "Invalid verification code entered.";
        } else {
            errorMessage.textContent = urlParams.get('error_description');
        }

        if (urlParams.get('rprq')) {
            showVerificationCodeInput(urlParams.get('rprq'));
        }
    }

    /*
        Step 8:

        Add functionality to the cancel button.
        If clicked, it should redirect back to the login page.

        client_id = b48565f3-456e-4251-9437-51ee330bdc02
        We use the token flow for simplicities sake.
        redirect_uri=https://connect-prod.cidaas.eu/user-profile/editprofile

        Better than going back to the Authz - call the authz resolve_redirect API:
        https://connect-prod.cidaas.eu/authz-srv/authz/resolve_redirect/4a509397-939d-42c9-a5f8-907dbd896bba

        Creating a new authz wil create a new login flow, so the user will loose any context information available through the requestId - 
        E.g. already set invite information for the user (family_name / given_name).
        Calling the authz/resolve_redirect will keep the same requestId
    */
    cancelButton.addEventListener('click', function () {
        window.location.href = 'https://connect-prod.cidaas.eu/authz-srv/authz?client_id=b48565f3-456e-4251-9437-51ee330bdc02&response_type=token&redirect_uri=https://connect-prod.cidaas.eu/user-profile/editprofile';
    });

});

/**
 * 
 * Step 4.: Call the reset Password API
 * 
 * @param {string} requestId 
 * @param {string} email 
 */
function resetPassword(requestId, email) {
    const resetPasswordUrl = 'https://connect-prod.cidaas.eu/users-srv/resetpassword/initiate';
    // Body: { "requestId": requestId, "processingType": "CODE", "resetMedium": "email", "email": email }

    // 4.1 Implement fetch - if rprq is returned, call the showVerificationCodeInput(rprq) function
    fetch(resetPasswordUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            requestId: requestId,
            processingType: 'CODE',
            resetMedium: 'email',
            email: email
        })
    })
        .then(response => {
            if (response.ok) {
                return response.json().then(data => {
                    // Response Body:
                    // {"success":true,"status":200,"data":{"reset_initiated":true,"rprq":"a1ebc763-5488-466c-8fdb-ecc77b13b78e"}}
                    const { reset_initiated, rprq } = data.data;
                    if (reset_initiated) {
                        // POST https://connect-prod.cidaas.eu/users-srv/resetpassword/validatecode
                        // Body example: resetRequestId=a1ebc763-5488-466c-8fdb-ecc77b13b78e&code=400812
                        if (rprq) {
                            showVerificationCodeInput(rprq)
                        }
                        console.log(`Password reset initiated successfully. Reset request ID: ${rprq}`);
                    } else {
                        console.error('Failed to initiate password reset');
                    }
                });
            } else {
                console.error('Failed to initiate password reset');
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

/**
 * Step 5:
 * 
 * Implement the showVerificationCodeInput
 * 
 * @param {string} rprq
 */
function showVerificationCodeInput(rprq) {
    // 5.1 Hide reset button & email form
    const resetButton = document.getElementById('reset-button');
    resetButton.classList.add('hidden');

    // 5.2 Show verification form
    const verificationForm = document.getElementById('verification-form');
    verificationForm.classList.remove('hidden');

    // 5.3 Set the rprq as value of the reset-request-id input for the later form post
    const cancelButton = document.getElementById('cancel-button');
    cancelButton.classList.remove('hidden');
}

/**
 * Step 9: Load Styling information
 * @param {string} requestId 
 */
function loadStylingInformation(requestId) {
    const url = 'https://connect-prod.cidaas.eu/public-srv/public/' + requestId;
    fetch(url).then(response => {
        if (response.ok) {
            response.json().then(data => {
                console.log(data)
                document.getElementById('background').style.backgroundImage = `url('${data.data.backgroundUri}')`;
                document.documentElement.style.setProperty('--form-border-color', data.data.accentColor);
                document.documentElement.style.setProperty('--primary-button-color', data.data.primaryColor);
            }).catch(error => {
                console.error('Error:', error);
            })
        } else {
            console.error('Failed to initiate password reset');
        }
    })
}