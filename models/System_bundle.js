let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);


const System_bundle = mongoose.Schema({
    admin: {type: ObjectId, ref: 'Admin'},
    title: String,
    desc: String,
    cost: Number,
    sale: Number,
    status: {type: String, enum: ["active", "delete"], default: "active"},
    type: {type: String, enum: ["zarlal", "bagtaamj", "semi"], default: "zarlal"},
    between: { // use for sales
        start_date: Date,
        end_date: Date,
    },
    days: {type: Number, default: 30},
    num_recruitment: Number,
    num_file_size:  Number,
    created: {type: Date, default: Date.now}
});


System_bundle.plugin(deepPopulate, {
    whitelist: ['admin', 'admin.avatar'],
    populate: {
        'admin': { select: '_id username avatar' },
        'admin.avatar': { select: '_id path url' }
    }
});


module.exports = mongoose.model('System_bundle', System_bundle);