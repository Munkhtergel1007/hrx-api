import {check, validationResult} from "express-validator/check";

let psl = require('psl');

import path from "path";
import fs from "fs";
import {matchedData} from "express-validator/filter";
import Users from "../../models/User";
import Company from "../../models/Company";
import Employee from "../../models/Employee";
import User from "../../models/User";
import winston from "winston";
import bcrypt from "bcrypt-node";
import jwt from "jsonwebtoken";
import config, {winsErr, isId, string, isPhoneNum, actionsKeys} from "../../config";
import settingsRoute from './settings_router';
import reportsRoute from './reports_router';
import express from "express";
import companyRoutes from "./company_router";
import empRoutes from "./employee_router";
import break_routers from "./break_routers";
import department_routers from "./department_routers";
import attendance_routers from "./attendance_routers";
import massAttendance_routes from "./massAttendance_routes";
import orlogoZarlaga_routers from "./orlogoZarlaga_routers";
import vacation_routers from './vacation_routers';
import assets_routers from './assets_routers';
import category_routers from './category_routers';
import warehouse_routers from './warehouse_routers';
import order_routers from './order_routers';
// import job_routers from './job_routers'
import workplan_routers from './workplan_routers'
import dashboard_routers from './dashboard_router'
import salary_routers from './salary_routers'
import orientation_routers from './orientation_routers'
import products_routers from './product_routers';
import workersArchive_routers from './workersArchive_routers';
import task_routers from "./task_routers";
import sell_routers from "./sell_routers";
import async from "async";
import {locale} from "../../lang";

module.exports = function(app) {

    app.get('/logout',function(req, res){
        req.session.destroy();
        res.clearCookie('token', { domain: `.${req.domain}` });
        return res.redirect("/");
    });

    app.post('/api/company/login' , [
        check('username')
            .trim(),
        check('password')
            .trim(),
    ], function(req, res){
        let data = matchedData(req);
        let regexUsername = new RegExp("^"+data.username+"$", "i");
        let emailUsername = new RegExp("^"+data.username+"$", "i");
        Users.findOne({$and: [{$or: [{username: regexUsername}, {email: emailUsername}]}, {status: 'active'}]}).deepPopulate('avatar').lean().exec(function (err, user) {
            if(err) {
                winston.error(err)
            }
            if (!user) {
                return res.json({success: false, msg: locale("user_not_found")});
            } else {
                let ps = user.password.replace("$2y$", "$2a$");
                // console.log('data.password', data.password);
                if (bcrypt.compareSync(data.password, ps)) {
                    let token = jwt.sign({id: user._id}, config.jwt_secret, {
                        expiresIn: 60*60*24
                    });
                    let tokenConf = { hostOnly:false,domain:`.${req.domain}` };
                    tokenConf = {...tokenConf, maxAge: 86400000};
                    res.cookie('token',token, tokenConf);
                    if((req.company || {})._id){
                        Employee.findOne({
                            company: req.company._id,
                            user: user._id,
                            $or: [
                                {status: {$eq: 'active'}},
                            ]
                        }).sort({created: -1}).deepPopulate('role').lean().exec(function(err, emp){
                            if(err){winsErr(req, err, 'Employee.findOne()');}
                            if(emp){
                                return res.status(200).json({success: true, user: {...user, password: null}, employee: emp});
                            } else {
                                return res.status(200).json({success: true, user: {...user, password: null}});
                            }
                        });
                    } else {
                        return res.status(200).json({success: true, user: {...user, password: null}});
                    }
                } else {
                    return res.status(200).json({success: false, msg: locale("passwordError.error")});
                }
            }
        });
    });




    const settings_route = express.Router();
    settingsRoute(settings_route);
    app.use('/api/company', settings_route);

    const reports_route = express.Router();
    reportsRoute(reports_route);
    app.use('/api/company', reports_route)

    const company_route = express.Router();
    companyRoutes(company_route);
    app.use('/api/company', company_route);

    const emp_route = express.Router();
    empRoutes(emp_route);
    app.use('/api/company', emp_route);

    const department_route = express.Router();
    department_routers(department_route);
    app.use('/api/company', department_route);

    const attendance_route = express.Router();
    attendance_routers(attendance_route);
    app.use('/api/company', attendance_route);

    const orlogoZarlaga_route = express.Router();
    orlogoZarlaga_routers(orlogoZarlaga_route);
    app.use('/api/company', orlogoZarlaga_route);

    const break_route = express.Router();
    break_routers(break_route);
    app.use('/api/company', break_route);

    const massAttendance_route = express.Router();
    massAttendance_routes(massAttendance_route);
    app.use('/api/company', massAttendance_route);

    const vacation_route = express.Router();
    vacation_routers(vacation_route);
    app.use('/api/company', vacation_route);

    const product_route = express.Router();
    products_routers(product_route);
    app.use('/api/company', product_route);

    const workerArchive_route = express.Router();
    workersArchive_routers(workerArchive_route);
    app.use('/api/company', workerArchive_route);

    const asset_route = express.Router();
    assets_routers(asset_route);
    app.use('/api/company', asset_route);

    const cat_route = express.Router();
    category_routers(cat_route);
    app.use('/api/company', cat_route);
    
    const warehouse_route = express.Router();
    warehouse_routers(warehouse_route);
    app.use('/api/company', warehouse_route);

    const order_route = express.Router();
    order_routers(order_route);
    app.use('/api/company', order_route);
    

    // const job_route = express.Router();
    // job_routers(job_route)
    // app.use('/api/company', job_route)

    const workplan_route = express.Router();
    workplan_routers(workplan_route);
    app.use('/api/company', workplan_route);

    const dashboard_route = express.Router();
    dashboard_routers(dashboard_route);
    app.use('/api/company', dashboard_route);

    const salary_route = express.Router();
    salary_routers(salary_route);
    app.use('/api/company', salary_route);

    const orientation_route = express.Router();
    orientation_routers(orientation_route);
    app.use('/api/company', orientation_route);

    const task_route = express.Router();
    task_routers(task_route);
    app.use('/api/company', task_route);

    const sell_route = express.Router();
    sell_routers(sell_route);
    app.use('/api/company', sell_route);

    app.get('/*', function(req, res, next){
        if (req.company) {
            let data = fs.readFileSync(`${path.join(__dirname, '../../../hrx_react', 'static')}/manifest.json`);
            let manifest = JSON.parse(data);
            let main = {
                main: {
                    references: req.references,
                    company: req.company,
                    employee: req.employee,
                    domain: req.domain,
                    user: req.user
                }
            };
            res.header("Content-Type", "text/html; charset=utf-8");
            res.status(200).end(renderIndex( main, manifest));
        } else {
            next();
        }
    });

};

function renderIndex(initialState, manifest) {
    const html =  `
    <!doctype html>
    <html lang="en">
      <head>
      <title>${locale("title")}</title> 
        <meta name="viewport" content="user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1, width=device-width, height=device-height">
<!--        <link href='/images/favicon.png' rel='shortcut icon' />-->
        <link rel="manifest" href="/manifest.json" />
        <script src="https://cdn.tiny.cloud/1/xo6szqntkvg39zc2iafs9skjrw8s20sm44m28p3klgjo26y3/tinymce/5/tinymce.min.js"></script>
      </head>
      <script>
      window.__INITIAL_STATE__ = ${JSON.stringify(initialState)}
      </script>
      <body>
        <div id="company">            </div>
        <script src=${process.env.NODE_ENV === 'development' ? '/dist/company.js' : manifest["company.js"]}></script>
        
      </body>
    </html>
  `
    return html;
}