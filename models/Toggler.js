let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

const Toggler = mongoose.Schema({
    company: {type: ObjectId, ref: 'Company'},
    user: {type: ObjectId, ref: 'User'},
    status: {type: String, enum: ["active", "pending"], default: "pending"},
    toggler: {
        health: {type: Boolean, default: true},
        violation: {type: Boolean, default: true},
        dismissal: {type: Boolean, default: true}
    },
    created: {type: Date, default: Date.now}
});

Toggler.plugin(deepPopulate, {
    whitelist: ['company', 'company.logo'],
    populate: {
        company: {
            select: '_id name slug logo'
        },
        'company.logo':{
            select:'_id path type thumb original_name url'
        },
    }
});

module.exports = mongoose.model('Toggler', Toggler);