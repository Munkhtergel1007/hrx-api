let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

const Recruitment = mongoose.Schema({
    title: {type: String, required: true},
    desc: String,   // tailbar
    other: String,  // busad shaardlaguud bagtana.
    salaryMin: Number, // tsalingiin dood hemjee. eswel 10-20 hoorond geh meteer ashiglana
    salaryMax: Number, // tsalingiin deed hemjee. eswel 10-20 hoorond geh meteer ashiglana
    requirements: [String],  // tawigdah shaardlaguud
    roleToJob: [String],    // hiih ajil, vvreg
    status: {type: String, enum: ["active", "expired", "emp_hired"]},
    company: {type: ObjectId, ref: 'Company'},
    cv_list: [{
        user: {type: ObjectId, ref: 'User'},
        status: {type: String, enum: ["hired", "fired", "quited", ""]}, // hired - hulsulsun, fired - ireed company tatgalzsan, quited - ireed uuriin sanalaar tatgalzsan
        updated: {type: Date, default: null},
        created: {type: Date, default: Date.now},
    }]
});


Recruitment.plugin(deepPopulate, {
    whitelist: ["cv_list.user", "cv_list.user.avatar"],
    populate: {
        "cv_list.user": {
            select: "_id username last_name first_name avatar phone email ability health toggler wasInmilitary profession gender family birth_place family_name register_id"
        }
    }
});


module.exports = mongoose.model('Recruitment', Recruitment);