let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);
let UserSchema = mongoose.Schema({
    username: {type: String, unique: true, required : true},
    password: String,
    first_name: String, // ner
    last_name: String, // owog
    email: {type: String},
    register_id: {type: String, unique: true, required: true},
    family_name: {type: String},
    bio: {type: String},
    about_me: {type: String},
    birth_place: {type: String},
    bloodType: {type: String, enum: ['o+', 'o-', 'a+', 'a-', 'b+', 'b-', 'ab+', 'ab-']},
    nationality: {type: String}, // ys undes
    hasChild: {type: Boolean, default: false}, // huuhedtei eseh
    children: {type: Number}, // huuhdiin too
    phone: {type: String},
    address: {
        region: {
            type: String,
            enum: ['Улаанбаатар', 'Архангай', 'Баян-Өлгий', 'Баянхонгор', 'Булган', 'Говь-Алтай', 'Говьсүмбэр', 'Дархан-Уул', 'Дорноговь', 'Дорнод', 'Дундговь', 'Завхан', 'Орхон', 'Өвөрхангай', 'Өмнөговь', 'Сүхбаатар', 'Сэлэнгэ', 'Төв', 'Увс', 'Ховд', 'Хөвсгөл', 'Хэнтий']
        },
        district: {type: String},
        horoo: {type: String},
        street: {type: String},
        streetNum: {type: String},
    },
    drivingLicense: [{type: String, enum:['a', 'b', 'c', 'd', 'e', 'm']}],
    otherPhones: [{type: String}],
    avatar: {type: ObjectId, ref: 'Media'},
    birthday: {type:Date},
    gender: {type: String, enum: ['male', 'female']},
    status: {type: String, enum: ['active', 'pending', 'delete'], default: 'pending'},
    family: {
        isMarried: {type: Boolean, default: false},
        familyMembers: [{
            phone: {type: String},
            phone1: {type: String},
            phone2: {type: String},
            email: {type: String},
            last_name: {type: String}, // owog
            first_name: {type: String}, // ner
            work_place: {type: String}, // ajliin gazar
            birthday: {type: Date},
            hen_boloh: {type: String, enum: ['nuhur', 'ehner', 'etseg', 'eh', 'ah', 'dvvEr', 'dvvEm', 'egch', 'huu', 'ohin', ''], default: ''}, // ger bvliin hen boloh
        }]
    },
    profession: [{
        name: {type: String},
        graduatedDate: {type: Date}, // tugssun ognoo
        enrolledDate: {type: Date}, // ellsen ognoo
        type: {type: String, enum: ["diplomiin","bachelor","magistr","dr", "other","baga","dund","burendund",""], default: ""}, // bolowsroliin zereg
        diplomId: {type: String},
        mergejil: {type: String},
        mergeshil: {type: String},
        gpa: {type: Number} //golch dun
    }],
    professionType: {type: String, enum: ["nothing", "baga", "buren_bus_dund", "buren_dund", "tehnikiin_bolon_mergejliin", "tusgai_mergejliin_dund", "buren_bus_deed", "deed", ""], default: ""}, // bolowsroliin tvwshin
    wasInmilitary: {type: Boolean, default: false},
    toggler: {
        health: {type: Boolean, default: false},
        violation: {type: Boolean, default: false}, // zurchliin tuhai medeelel
        dismissal: {type: Boolean, default: false}  // ajilaas garsan tuhai medeelel
    },
    ability: [{
        name: {type: String},
        level: {type: String}
    }],
    health: [{
        name: {type: String},
        type: {type: String, enum: ["ervvl", "huuch_uwchtei", "udaan_uwdsun"]},
        company_medic: {
            date: {type: Date},
            company_name: {type: String}, // company baihgvi bol ner oruulah
            company: {type: ObjectId, ref: 'Company'}, // bvrtgeltei bol company nemeh
            cost: {type: Number}
        }
    }],
    qualification_training: [{ // meregshvvleh surgaltiin talaar
        name: {type: String},
        company: {type: ObjectId, ref: 'Company'}, // herew surj baisan surgaltiin baiguullaga manai system d bvrtgeltei bol. / hereglegch vvsgeh eswel hvnii nuutsiin ajiltan nemeh ved hailt dundaas garj irne /
        start_date: Date, // surgalt ehelsen udur
        end_date: Date, // surgalt duussan udur
        chiglel: {type: String},
        gerchilgeenii_dugaar: {type: String}, // vnemleh eswel gerchilgeenii dugaar
        gerchilgee_date: {type: Date}, // vnemleh eswel gerchilgee awsan udur
    }],
    work_experience: [{
        name: {type: String},
        company: {type: ObjectId, ref: 'Company'}, // herew ajillaj baisan baiguullaga manai system d bvrtgeltei bol. / hereglegch vvsgeh eswel hvnii nuutsiin ajiltan nemeh ved hailt dundaas garj irne /
        position: {type: String},
        workFrom: {type: Date},
        workUntil: {type: Date},
    }],
    reward: [{
        name: {type: String},
        date: {type: Date}, //shagnuulsan ognoo
        company_name: {type: String} //shagnal olgoson company
    }],
    special_ability: [{
        name: {type: String},
        level: {type: String}
    }],
    created: {type:Date, default: Date.now}
});
UserSchema.plugin(deepPopulate, {
    whitelist: ['avatar'],
    populate: {
        'avatar': {
            select: '_id path thumb original_name url'
        }
    }
});
module.exports = mongoose.model('User', UserSchema);
