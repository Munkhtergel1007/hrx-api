let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

const CompanySchema = mongoose.Schema({
    name: {type: String, required: true},
    // slug: {type: String, unique: true, required: true},
    domain: {type: String, unique: true, required: true},
    isCons: {type: Boolean, default: false},
    actions: [{
        type: String,
        required: true
    }],
    description: {type: String},
    website: {type: String},
    mission: {type: String},  // erhem zorilgo
    vision: {type: String}, // alsiin haraa
    value: {type: String}, // unet zuil
    phone: {type: String},
    status: {type: String, enum: ["active", "delete", "pending", "lock", "disapprove"], default: "pending"},
    slogan: {type: String}, // uria vg
    address: {type: String},
    email: {type: String},
    created: {type: Date, default: Date.now},
    parent: {type: ObjectId, ref: "Company"}, // parent company buyu tolgoi company manaihaar bol Tom Amjilt LLC
    logo: {type: ObjectId, ref: "Media"},
    cover: {type: ObjectId, ref: "Media"}, // zarlal hesgees company iin zarlal harah ved haragdana
    slider: [{type: ObjectId, ref: "Media"}], // zarlal hesgees company iin zarlal vzhed taniltsuulga bvhii slider
    independent: {type: Boolean, default: true},
    willBeDeletedBy: {type: Date},
    deletionRequestedBy: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    cancelledBy: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    approved_date: {type: Date},
    registeredSite: {type: String}, // tapsir.com tatatunga.mn etc..
});

CompanySchema.plugin(deepPopulate, {
    whitelist: ['logo', 'cover', 'slider'],
    populate: {
        'logo':{
            select:'_id path name url thumb imageWidth imageHeight'
        },
        'cover':{
            select:'_id path name url thumb imageWidth imageHeight'
        },
        'slider':{
            select:'_id path name url thumb imageWidth imageHeight'
        }
    }
});

module.exports = mongoose.model('Company', CompanySchema);