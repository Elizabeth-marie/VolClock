const express = require('express');

const router = express.Router();
const knex = require('../knex');
const routeCatch = require('./routeCatch');

/* **************************************************
*  GET /login/:login_code
*  Lookup login_code:
*     If found, return user object
*     If not found, return user = "null"
*  Return
*    200 { user: { id, fname, ... } }
*    200 { user: "null" }
http GET localhost:3000/users/login/0000
***************************************************** */
router.get('/login/:login_code', (req, res, next) => {
  knex('users')
    .where('login_code', req.params.login_code)
    .then((result) => {
      if (!result.length) { res.status(200).json({ user: null })}
      res.json({ user: result[0] })
    })
    .catch((error) => {
      next(routeCatch(`--- GET /login/${req.params.user_id} route`, error));
    });
})

/* **************************************************
*  GET /:id
*  Lookup login_code:
*     If found, return user object
*     If not found, return user = "null"
*  Return
*    200: {
        user: { id, fname, ... },
        roles: [ { id, role }, { id, role } ] ,
        last_role: { id, role }
}
http GET localhost:3000/users/2
***************************************************** */
router.get('/:id', (req, res, next) => {
  let saveUser = null;
  knex('users')
    .where('users.id', req.params.id)
    .returning('*')
    .then((user) => {
      // console.log("GET -- user: ", user);
      if (!user.length) {
        console.log(`--- users get ${req.params.id} -- rec not found`);
        const error = new Error(`unable to get user ${req.params.id}, not found`);
        error.status = 404;
        throw error;
      }
      saveUser = user[0];
    })
    .then(() => {
      // console.log("GET -- getting user roles");
      return knex('users_roles')
        .join('roles', 'roles.id', 'users_roles.role_id')
        .where('user_id', req.params.id)
        .returning(['roles.id', 'roles.role']);
    })
    .then((result) => {
      // console.log("--- GET resut of roles: ", result);
      res.status(200).send({ user: saveUser, roles: result });
    })
    .catch((error) => {
      next(routeCatch(`--- GET /user/${req.params.user_id} route`, error));
    });
});

module.exports = router;
