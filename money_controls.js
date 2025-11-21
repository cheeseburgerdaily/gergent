// money_controls.js
const handleDeposit = () => {
    window.location.href = 'money_transfer.html?action=deposit';
};

const handleWithdraw = () => {
    window.location.href = 'money_transfer.html?action=withdraw';
};

document.addEventListener('DOMContentLoaded', () => {
    const depositBtn = document.getElementById('depositBtn');
    const withdrawBtn = document.getElementById('withdrawBtn');

    if (depositBtn) depositBtn.addEventListener('click', handleDeposit);
    if (withdrawBtn) withdrawBtn.addEventListener('click', handleWithdraw);

    if (typeof refreshMoney === 'function') refreshMoney();
});