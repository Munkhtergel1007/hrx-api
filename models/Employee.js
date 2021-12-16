let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);


const Employee = mongoose.Schema({
    user: {type: ObjectId, ref: 'User'},
    company: {type: ObjectId, ref: 'Company'},
    // department: {type: ObjectId, ref: 'Department'},
    timetable: {type: ObjectId, ref: 'Timetable'},
    phoneFromComp: {type: String},
    emailFromComp: {type: String},
    role: {type: ObjectId, ref: 'Roles'},
    staticRole: {type: String, enum: ['chairman', 'hrManager', 'employee', 'attendanceCollector', 'lord'], default: 'employee'},
    status: {type: String, enum: ['fired', 'active', 'delete', 'contracted']},
    section: {type: String}, // heltes
    position_name: {type: String}, // alban tushaal

    // employment visible
    employmentVisible: Boolean,
    employment: [{ //Alban tushaal solih, ajlaas garah, oroh, shagnal avah, surgaltand suuh
        created: {type: Date, default: Date.now()},
        date: {type: Date},
        type: {type: String, enum: ['in', 'out', 'role', 'violation', 'reward', 'lesson']},
        // Role
        role: {type: ObjectId, ref: "Roles"},
        roleTitle: String,
        // Reward
        rewardTitle: String,
        rewardFrom: String,
        // Violation
        violation: String,
        // Ajlaas garah
        reference: {type: ObjectId, ref: 'Reference'}
    }],
    bank: {
        name: {type: String, enum: ['khaan', 'golomt', 'khas', 'khkh', 'bogd', 'turiin', 'arig', 'credit', 'capitron', 'undesnii_hurungu', 'ariljaa', 'teever_hugjil']},
        account: String
    },
    dismissal_info: { // halagdsan eswel garsan tuhai
        urgudul: {type: ObjectId, ref: 'Media'},
        reason: String,
        tushaalText: String,
        tushaalFile: {type: ObjectId, ref: 'Media'},
        date: Date
    },
    internDate: { // dadlaga ehleh ved
        start_date: Date,
        end_date: Date
    },
    workFrom: Date, // ajillaj ehelsen udur
    created: {type: Date, default: Date.now},
    cardId: {type: String}
});


Employee.plugin(deepPopulate, {
    whitelist: ['user', 'user.avatar', 'company', 'company.logo', 'role', 'dismissal_info.tushaalFile', 'dismissal_info.urgudul', 'timetable'],
    populate: {
        'user': {
            select: '_id avatar username last_name first_name email phone register_id'
        },
        'user.avatar': {
            select: '_id path url'
        },
        'company':{
            select:'_id domain name phone email logo'
        },
        'company.logo':{
            select:'_id path name url thumb'
        },
        'role': {
            select: '_id name desc actions created'
        },
        'dismissal_info.urgudul': {
            select: '_id path url forWhat type name original_name size thumb'
        },
        'dismissal_info.tushaalFile': {
            select: '_id path url forWhat type name original_name size thumb'
        },
        'timetable': {
            select: '_id title days status created'
        }
    }
});


module.exports = mongoose.model('Employee', Employee);