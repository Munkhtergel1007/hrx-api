let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);
let SalaryLogSchema = mongoose.Schema({
    company: {type: ObjectId, ref: 'Company'},
    salary: {type: ObjectId, ref: 'Salary'},
    initial_salary: {type: Number, default: 0},
    employee: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}}, // tsalin-d uurchlult oruulsan hun
    action:{type:String, enum:['created', 'updated', 'pending', 'idle', 'approved', 'declined', 're_open', 'deleted'], required:true},
    created: {type:Date, default: Date.now},
    year_month: {type:Date},
    add:[ {
        amount: {type: Number, default:0},
        type: {type: String, enum: ['busad', 'nemegdel', 'uramshuulal', 'iluu_tsagiin_huls']},
        description: {type:String},
    }],
    sub: [{
        amount: {type: Number, default:0},
        type: {type: String, enum: ['busad', 'n_d_sh', 'h_h_o_a_t', 'hotsrolt', 'taslalt']},
        description: {type:String},
    }],
    hungulult: {type: Number, default: 0},
    hool_unaanii_mungu: {type: Number, default: 0},
});
SalaryLogSchema.plugin(deepPopulate, {
    whitelist: ['employee.user', 'salary'],
    populate: {
        'employee.user': {
            select: '_id first_name last_name avatar'
        },
        'salary': {
            select: '_id employee.emp employee.user'
        }
    }
});
module.exports = mongoose.model('SalaryLog', SalaryLogSchema);