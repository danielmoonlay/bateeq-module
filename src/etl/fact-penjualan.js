'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;
var moment = require("moment");

var ItemManager = require('../../src/managers/master/item-manager');
var BankManager = require('../../src/managers/master/bank-manager');
var CardTypeManager = require('../../src/managers/master/card-type-manager');
var StoreManager = require('../../src/managers/master/store-manager');
var SalesManager = require('../../src/managers/sales/sales-manager');

// internal deps 
require('mongodb-toolkit');
const migrationName = "ETL-FactPenjualan";

module.exports = class FactPenjualan {
    constructor(db, user, sql) {
        this.db = db;
        this.sql = sql;
        this.SalesManager = new SalesManager(db, user);
        this.migrationLog = db.collection("migration.log");
    }

    run() {
        var startedDate = new Date();
        return new Promise((resolve, reject) => {
            this.lastETLDate().then(lastMigration => {

                this.migrationLog.insert({
                    migration: migrationName,
                    _start: startedDate,
                    _createdDate: startedDate
                })

                this.extract(lastMigration._createdDate)
                    .then((data) => {
                        this.transform(data).then((data) => {
                            this.load(data).then((result) => {
                                var finishedDate = new Date();
                                var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                                var updateLog = {
                                    migration: migrationName,
                                    _start: startedDate,
                                    _createdDate: startedDate,
                                    _end: finishedDate,
                                    executionTime: spentTime + " minutes",
                                    status: "success"
                                };
                                this.migrationLog.updateOne({ _createdDate: startedDate }, updateLog);
                                resolve(result);
                            })
                                .catch((err) => {
                                    var finishedDate = new Date();
                                    var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                                    var updateLog = {
                                        migration: migrationName,
                                        _start: startedDate,
                                        _createdDate: startedDate,
                                        _end: finishedDate,
                                        executionTime: spentTime + " minutes",
                                        status: err
                                    };
                                    this.migrationLog.updateOne({ _createdDate: startedDate }, updateLog);
                                    console.log(err);
                                    reject(err);
                                });
                        }).catch((err) => {
                            var finishedDate = new Date();
                            var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                            var updateLog = {
                                migration: migrationName,
                                _start: startedDate,
                                _createdDate: startedDate,
                                _end: finishedDate,
                                executionTime: spentTime + " minutes",
                                status: err
                            };
                            this.migrationLog.updateOne({ _createdDate: startedDate }, updateLog);
                            console.log(err);
                            reject(err);
                        });
                    }).catch((err) => {
                        var finishedDate = new Date();
                        var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                        var updateLog = {
                            migration: migrationName,
                            _start: startedDate,
                            _createdDate: startedDate,
                            _end: finishedDate,
                            executionTime: spentTime + " minutes",
                            status: err
                        };
                        this.migrationLog.updateOne({ _createdDate: startedDate }, updateLog);
                        console.log(err);
                        reject(err);
                    });
            })
        });
    }

    lastETLDate() {
        return new Promise((resolve, reject) => {
            this.migrationLog.find({ "migration": migrationName, status: "success" }).sort({ "_createdDate": -1 }).limit(1).toArray()
                .then((result) => {
                    if (result[0])
                        resolve(result[0] || { _createdDate: new Date("1970-01-01") });
                }).catch((err) => {
                    reject(err);
                })
        })
    }

    extract(date) {
        var timestamp = date || new Date("1970-01-01");
        return this.SalesManager.collection.find({
            _deleted: false,
            isVoid : false,
            _updatedDate: {
                "$gt": timestamp
            }
        }).toArray();
    }

    getDBValidString(str) {
        if (str) {
            if ((typeof str) == "string")
                return str.split("'").join("''")
            else
                return str
        }
        else {
            if ((typeof str) == "number")
                return "0";
            else
                return ""
        }
    }

    getArticles() {
        return new Promise((resolve, reject) => {
            var motifs = this.db.collection("article-motifs").find({}).toArray();
            var subcounters = this.db.collection("article-sub-counters").find({}).toArray();
            var counters = this.db.collection("article-counters").find({}).toArray();
            var materials = this.db.collection("article-materials").find({}).toArray();
            var sizes = this.db.collection("article-sizes").find({}).toArray();

            Promise.all([motifs, subcounters, counters, materials, sizes])
                .then((results) => {
                    if (results[0])
                        this.motifs = results[0];
                    if (results[1])
                        this.subcounters = results[1];
                    if (results[2])
                        this.counters = results[2];
                    if (results[3])
                        this.materials = results[3];
                    if (results[4])
                        this.sizes = results[4];
                    resolve(true);
                })
                .catch((error) => {
                    reject(error);
                })
        });
    }

    getMotif(barcode) {
        if (barcode && this.motifs) {
            var find = this.motifs.find(o => o.code == barcode.substring(9, 11));
            if (find)
                return find.name;
        }

        return "";
    }

    getSize(barcode) {
        if (barcode && this.sizes) {
            var find = this.sizes.find(o => o.code == barcode.substring(7, 9));
            if (find)
                return find.name;
        }

        return "";
    }

    getMaterial(barcode) {
        if (barcode && this.materials) {
            var find = this.materials.find(o => o.code == barcode.substring(5, 7));
            if (find)
                return find.name;
        }

        return "";
    }

    getSubCounter(barcode) {
        if (barcode && this.subcounters) {
            var find = this.subcounters.find(o => o.code == barcode.substring(3, 5));
            if (find)
                return find.name;
        }

        return "";
    }

    getCounter(barcode) {
        if (barcode && this.counters) {
            var find = this.counters.find(o => o.code == barcode.substring(1, 3));
            if (find)
                return find.name;
        }

        return "";
    }

    getEmbalase() {
        return new Promise((resolve, reject) => {
            this.db.collection("migration-excluded-items").find({ _deleted: false }).toArray()
                .then((result) => {
                    resolve(result);
                }).catch((error) => {
                    reject(error);
                })
        });
    }

    transform(data) {
        return new Promise((resolve, reject) => {
            Promise.all([this.getArticles(), this.getEmbalase()]).then((x) => {
                if (x) {
                    if (x[0] && x[1]) {
                        var embalaseBarcode = x[1].map((o) => o.code);
                        var count = 1;

                        var result = data.map((sale) => {
                            var items = sale.items.map((item) => {
                                if (embalaseBarcode.indexOf(item.item.code) == -1 && !item.isReturn) {
                                    return {
                                        timekey: `'${moment(sale.date).format("L")}'`,
                                        countdays: `'${moment(sale.date).daysInMonth()}'`,
                                        store_code: sale.store ? `'${this.getDBValidString(sale.store.code)}'` : null,
                                        hd_transaction_number: `'${this.getDBValidString(sale.code)}'`,
                                        hd_shift: `'${this.getDBValidString(sale.shift)}'`,
                                        hd_subtotal: `'${this.getDBValidString(sale.subTotal)}'`,
                                        hd_sales_discount_percentage: `'${this.getDBValidString(sale.discount)}'`,
                                        hd_grandtotal: `'${this.getDBValidString(sale.grandTotal)}'`,
                                        hd_payment_type: `'${this.getDBValidString(sale.salesDetail.paymentType)}'`,
                                        hd_card: `'${this.getDBValidString(sale.salesDetail.card)}'`,
                                        hd_card_type: `'${this.getDBValidString(sale.salesDetail.cardType.name)}'`,
                                        hd_bank_name: `'${this.getDBValidString((!sale.salesDetail.bank.name || sale.salesDetail.bank.name == "-") ? "" : sale.salesDetail.bank.name)}'`,
                                        hd_card_number: `'${this.getDBValidString(sale.salesDetail.cardNumber)}'`,
                                        hd_voucher_amount: sale.salesDetail.voucher ? `'${this.getDBValidString(sale.salesDetail.voucher.value)}'` : `'0'`,
                                        hd_cash_amount: sale.salesDetail.cashAmount ? `'${this.getDBValidString(sale.salesDetail.cashAmount)}'` : `'0'`,
                                        hd_card_amount: sale.salesDetail.cardAmount ? `'${this.getDBValidString(sale.salesDetail.cardAmount)}'` : `'0'`,
                                        dt_item_name: `'${this.getDBValidString(item.item.name)}'`,
                                        dt_item_quantity: `'${this.getDBValidString(item.quantity)}'`,
                                        dt_barcode: `'${this.getDBValidString(item.item.code)}'`,
                                        dt_motif_name: `'${this.getDBValidString(this.getMotif(item.item.code))}'`,
                                        dt_counter_name: `'${this.getDBValidString(this.getCounter(item.item.code))}'`,
                                        dt_subcounter_name: `'${this.getDBValidString(this.getSubCounter(item.item.code))}'`,
                                        dt_material_name: `'${this.getDBValidString(this.getMaterial(item.item.code))}'`,
                                        dt_size_name: `'${this.getDBValidString(this.getSize(item.item.code))}'`,
                                        dt_mainsalesprice: `'${this.getDBValidString(item.item.domesticCOGS)}'`,
                                        dt_item_price: `'${this.getDBValidString(item.price)}'`,
                                        dt_is_discount_percentage: `'${(item.discountNominal > 0) ? '0' : '1'}'`,
                                        dt_fixed_discount_amount: `'${this.getDBValidString(item.discountNominal)}'`,
                                        dt_discount_product_percentage: `'${this.getDBValidString(item.discount1)}'`,
                                        dt_discount_product_percentage_additional: `'${this.getDBValidString(item.discount2)}'`,
                                        dt_special_discount_product_percentage: `'${this.getDBValidString(item.specialDiscount)}'`,
                                        dt_margin_percentage: `'${this.getDBValidString(item.margin)}'`,
                                        dt_total_price_per_product: `'${this.getDBValidString(item.total)}'`,
                                        store_name: `'${this.getDBValidString(sale.store.name)}'`,
                                        store_city: `'${this.getDBValidString(sale.store.city)}'`,
                                        store_open_date: sale.store.openedDate ? `'${moment(sale.store.openedDate).format("L")}'` : null,
                                        store_close_date: sale.store.closedDate ? `'${moment(sale.store.closedDate).format("L")}'` : null,
                                        store_area: `'${this.getDBValidString(sale.store.storeArea)}'`,
                                        store_status: `'${this.getDBValidString(sale.store.status)}'`,
                                        store_wide: `'${this.getDBValidString(sale.store.storeWide)}'`,
                                        store_offline_online: `'${this.getDBValidString(sale.store['online-offline'])}'`,
                                        store_sales_category: `'${this.getDBValidString(sale.store.salesCategory)}'`,
                                        store_monthly_total_cost: `'${this.getDBValidString(sale.store.monthlyTotalCost)}'`,
                                        store_category: `'${this.getDBValidString(sale.store.storeCategory)}'`,
                                        store_montly_omzet_target: `'${this.getDBValidString(sale.store.salesTarget)}'`,
                                        hd_pos: `'${this.getDBValidString(sale.pos)}'`,
                                        hd_bank_card: `'${this.getDBValidString((!sale.salesDetail.bankCard.name || sale.salesDetail.bankCard.name == "-") ? "" : sale.salesDetail.bankCard.name)}'`
                                    }
                                    console.log(`Transform data : ${count}`)
                                    count++;
                                }
                            });
                            return [].concat.apply([], items);
                        });
                        resolve([].concat.apply([], result));
                    } else {
                        reject("invalid");
                    }
                }
            });
        });
    }


    insertQuery(sql, query) {
        return new Promise((resolve, reject) => {
            sql.query(query, function (err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            })
        })
    }

    load(data) {
        return new Promise((resolve, reject) => {
            this.sql.startConnection()
                .then(() => {

                    var transaction = this.sql.transaction();

                    transaction.begin((err) => {

                        var request = this.sql.transactionRequest(transaction);

                        var command = [];

                        var sqlQuery = '';

                        var count = 1;

                        for (var item of data) {
                            if (item) {
                                var queryString = `INSERT INTO [BTQ_FactPenjualan_Temp] ([timekey],[countdays],[store_code],[hd_transaction_number],[hd_shift],[hd_subtotal],[hd_sales_discount_percentage],[hd_grandtotal],[hd_payment_type],[hd_card],[hd_card_type],[hd_bank_name],[hd_card_number],[hd_voucher_amount],[hd_cash_amount],[hd_card_amount],[dt_item_name],[dt_item_quantity],[dt_barcode],[dt_motif_name],[dt_counter_name],[dt_subcounter_name],[dt_material_name],[dt_size_name],[dt_mainsalesprice],[dt_item_price],[dt_is_discount_percentage],[dt_fixed_discount_amount],[dt_discount_product_percentage],[dt_discount_product_percentage_additional],[dt_special_discount_product_percentage],[dt_margin_percentage],[dt_total_price_per_product],[store_name],[store_city],[store_open_date],[store_close_date],[store_area],[store_status],[store_wide],[store_offline_online],[store_sales_category],[store_monthly_total_cost],[store_category],[store_montly_omzet_target],[hd_pos],[hd_bank_card]) values(${item.timekey},${item.countdays},${item.store_code},${item.hd_transaction_number},${item.hd_shift},${item.hd_subtotal},${item.hd_sales_discount_percentage},${item.hd_grandtotal},${item.hd_payment_type},${item.hd_card},${item.hd_card_type},${item.hd_bank_name},${item.hd_card_number},${item.hd_voucher_amount},${item.hd_cash_amount},${item.hd_card_amount},${item.dt_item_name},${item.dt_item_quantity},${item.dt_barcode},${item.dt_motif_name},${item.dt_counter_name},${item.dt_subcounter_name},${item.dt_material_name},${item.dt_size_name},${item.dt_mainsalesprice},${item.dt_item_price},${item.dt_is_discount_percentage},${item.dt_fixed_discount_amount},${item.dt_discount_product_percentage},${item.dt_discount_product_percentage_additional},${item.dt_special_discount_product_percentage},${item.dt_margin_percentage},${item.dt_total_price_per_product},${item.store_name},${item.store_city},${item.store_open_date},${item.store_close_date},${item.store_area},${item.store_status},${item.store_wide},${item.store_offline_online},${item.store_sales_category},${item.store_monthly_total_cost},${item.store_category},${item.store_montly_omzet_target},${item.hd_pos},${item.hd_bank_card})\n`;
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 1000 == 0) {
                                    command.push(this.insertQuery(request, sqlQuery));
                                    sqlQuery = "";
                                }
                                console.log(`add data to query  : ${count}`);
                                count++;
                            }
                        }

                        if (sqlQuery != "")
                            command.push(this.insertQuery(request, `${sqlQuery}`));

                        request.multiple = true;

                        // var fs = require("fs");
                        // var path = "C:\\Users\\daniel.nababan.MOONLAY\\Desktop\\sqlQuery.txt";

                        // fs.writeFile(path, sqlQuery, function (error) {
                        //     if (error) {
                        //         console.log("write error:  " + error.message);
                        //     } else {
                        //         console.log("Successful Write to " + path);
                        //     }
                        // });

                        return Promise.all(command)
                            .then((results) => {
                                request.execute("BTQ_Upsert_FactPenjualan").then((execResult) => {
                                    transaction.commit((err) => {
                                        if (err)
                                            reject(err);
                                        else
                                            resolve(results);
                                    });
                                }).catch((error) => {
                                    transaction.rollback((err) => {
                                        if (err)
                                            reject(err)
                                        else
                                            reject(error);
                                    });
                                })
                            })
                            .catch((error) => {
                                transaction.rollback((err) => {
                                    console.log("rollback");
                                    if (err)
                                        reject(err)
                                    else
                                        reject(error);
                                });
                            });
                    });
                })
                .catch((err) => {
                    reject(err);
                })
        });
    }
}
