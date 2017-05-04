var global = require('../../global');

module.exports = function (expeditions) {

    var locale = global.config.locale;

    var moment = require('moment');
    moment.locale(locale.name);

    var header = { text: "BON PENGELUARAN BARANG", style: ['size20', 'bold', 'headerMargin', {}], alignment: 'center' };

    var table1 = [
        {
            columns: [
                { width: '40%', text: "No Bon", style: ['size12', 'bold'], alignment: 'left' },
                { width: '60%', text: expeditions.code, style: ['size12'], alignment: 'left' }
            ]
        },
        {
            columns: [
                { width: '40%', text: "Tanggal", style: ['size12', 'bold'], alignment: 'left' },
                { width: '60%', text: `${moment(expeditions._createdDate).format(locale.date.format)}`, style: ['size12'], alignment: 'left' }
            ]
        }
    ]

    var table2 = [
        {
            columns: [
                { width: '40%', text: "Tujuan", style: ['size12', 'bold'] },
                { width: '60%', text: expeditions.spkDocuments[0].destination.name || "", style: ['size12'] }
            ]
        },
        {
            columns: [
                { width: '40%', text: "Ekspedisi", style: ['size12', 'bold'] },
                { width: '60%', text: expeditions.expedition.name || expeditions.expedition, style: ['size12'] }
            ]
        },
        {
            columns: [
                { width: '40%', text: "Total Berat (Kg)", style: ['size12', 'bold'] },
                { width: '60%', text: expeditions.weight, style: ['size12'] }
            ]
        }
    ];

    var subHeader = {
        columns: [
            {
                width: "50%",
                stack: [
                    { text: "PT EFRATA RETAILINDO", style: ['size12', 'bold'] },
                    {
                        text: "Kel. Banaran, Kec. Grogol, Kab.Sukoharjo 57193 Jawa Tengah, Indonesia",
                        style: ['size12']
                    }
                ]
            },
            {
                width: "50%",
                columns: [
                    {
                        width: '30%',
                        text: ''
                    },
                    {
                        width: '70%',
                        stack: table1,
                    }
                ],
                alignment: 'right'
            }
        ],
        style: ['marginTop20']
    };

    var thead = [
        { text: "No", style: 'tableHeader' },
        { text: "Packing List", style: 'tableHeader' },
        { text: "Beart (Kg)", style: 'tableHeader' },
        { text: "Total Barang", style: 'tableHeader' }
    ]

    var index = 1;
    var tbody = expeditions.spkDocuments.map(item => {
        var totalBarang = 0;
        if (item.items.length > 1) {
            totalBarang = item.items.reduce((prev, curr) => prev.quantity + curr.quantity);
        } else {
            totalBarang = item.items[0].quantity;
        }

        return [
            index++,
            item.code,
            item.weight || 0,
            totalBarang
        ]
    });

    var data1 = {
        columns: [{ width: '50%', stack: table2, style: ['marginTop20'] }],
    }

    var data2 = {
        table: {
            headerRows: 1,
            widths: ['15%', '35%', '25%', '25%'],
            body: [].concat([thead], tbody)
        },
        style: ['marginTop20']
    }

    var data3 = {
        table: {
            headerRows: 0,
            width: ['75%', '25%'],
            body: [
                [{ text: 'Total', style: ['bold', 'size12'], alignment: 'center' },
                { text: 'Total', style: ['bold', 'size12'], alignment: 'center' }]
            ]
        }
    }

    var dd = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: 20,
        content: [
            header,
            subHeader,
            data1,
            data2
        ],
        styles: {
            size06: {
                fontSize: 6
            },
            size07: {
                fontSize: 7
            },
            size08: {
                fontSize: 8
            },
            size09: {
                fontSize: 9
            },
            size10: {
                fontSize: 10
            },
            size12: {
                fontSize: 12
            },
            size15: {
                fontSize: 15
            },
            size20: {
                fontSize: 20
            },
            bold: {
                bold: true
            },
            center: {
                alignment: 'center'
            },
            left: {
                alignment: 'left'
            },
            right: {
                alignment: 'right'
            },
            justify: {
                alignment: 'justify'
            },
            tableHeader: {
                bold: true,
                fontSize: 12,
                color: 'black',
                alignment: 'center'
            },
            marginTop20: {
                margin: [0, 20, 0, 0]
            },
            noBorder: {
                border: 0
            }
        }
    };

    return dd;
}