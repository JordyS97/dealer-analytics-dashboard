const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

function generateTemplate() {
    // Define Headers
    const salesOverviewHeaders = [
        "No Mesin", "No. Rangka", "Tgl Mohon", "Nama", "Alamat", "Kel", "Kec", "Kode Pos", "KTP No", "DP Aktual", "Tenor3", "Cicilan", "Tipe ATPM", "Warna", "Tipe Var Plus", "Cust No.", "Dealer/SO", "Area Dealer", "Transaksi", "Fincoy", "Unit", "Rakitan Unit", "Konsumen", "Pekerjaan4", "Gender5", "Motor Sebelum", "Tanggal SSU", "Grup Dealer", "SF", "Position"
    ];

    const detailSalespeopleHeaders = [
        "Area Dealer", "Kode Dealer", "Nama Dealer", "No Prospect", "Tanggal Prospect", "No SPK", "Tanggal SPK", "Tanggal Billing", "No Billing", "Nama Customer", "Nama Salesman", "Status Salesman", "Jenis Konsumen", "Metode Pembelian", "Nama Fincoy/Perusahaan MOP", "DP", "Tenor", "Angsuran", "Tipe Motor", "Harga OFR", "Diskon Total", "Net Sales", "Beban Dealer", "Beban MD", "Beban AHM", "Beban Fincoy", "Status Delivery"
    ];

    const prospectHeaders = [
        "Region", "Kode Dealer", "Nama Dealer", "ProspectNumber", "Salesman Name", "Employee Status", "RegistrationDate", "Gender", "Occupation", "Source Prospect", "First Prospect Status", "Prospect Status", "Reason", "FollowUpDate", "FollowUp Status"
    ];

    const wb = xlsx.utils.book_new();

    const ws1 = xlsx.utils.aoa_to_sheet([salesOverviewHeaders]);
    xlsx.utils.book_append_sheet(wb, ws1, "Sales Overview");

    const ws2 = xlsx.utils.aoa_to_sheet([detailSalespeopleHeaders]);
    xlsx.utils.book_append_sheet(wb, ws2, "Detail Salespeople");

    const ws3 = xlsx.utils.aoa_to_sheet([prospectHeaders]);
    xlsx.utils.book_append_sheet(wb, ws3, "Prospect Acquisition");

    const outputPath = path.join(__dirname, "public", "Astra_Analytics_Data_Template.xlsx");

    // Ensure public folder exists
    if (!fs.existsSync(path.join(__dirname, "public"))) {
        fs.mkdirSync(path.join(__dirname, "public"));
    }

    xlsx.writeFile(wb, outputPath);
    console.log(`Template generated successfully at ${outputPath}`);
}

generateTemplate();
