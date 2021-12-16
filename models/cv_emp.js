let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

const Cv_emp = mongoose.Schema({
    user: {type: ObjectId, ref: 'User'},
    company: {type: ObjectId, ref: 'Company'},
    assignment: [{ // tomilolt
        workplace_name: {type: String}, // ajliin bairnii ner
        post_rank: {type: String}, // alban tushaaliin zereglel
        date: {type: Date}
    }],
    salary_info: [{ // tsalingiin medeelel // alban tushaalaas hamaarch tsalin uurchlugduh ved nemegdene. hamgiin svvliihiig haruulna.
        date: {type: Date, default: Date.now},
        salary: {type: Number, default: 0},
        additionalPercent: {type: String},
        additional: {type: String},
        hangamj: {type: String},
        position_name: {type: String} // alban tushaaliin ner
    }],
    violation_info: [{  // zurchliin tuhai
        aboutViolation: String,
        date: Date,
        tushaalText: String,
        tushaalFile: {type: ObjectId, ref: 'Media'}
    }],
    reward: [{
        date: {type: Date, default: new Date},
        reward_name: {type: String},
        reward_ground: {type: String} // shagnagdsan vndeslel
    }], // shagnal uramshuulal
    created: {type: Date, default: Date.now}
});

Cv_emp.plugin(deepPopulate, {
    whitelist: ['company', 'company.logo'],
    populate: {
        'company': {
            select: '_id name slug logo'
        },
        'company.logo': {
            select: '_id path name original_name url thumb'
        }
    }
});

module.exports = mongoose.model('cv_emp', Cv_emp);