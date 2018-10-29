const express = require('express');
const knex = require('../knex');
const { chkBodyParams } = require('./params'); // destructure the chkBodyParams out of require('./params') returned object

const router = express.Router();

/* **************************************************
*  getDateToday
*  Get just the date for today (with time of 00:00:00)
***************************************************** */
function getDateToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

/* **************************************************
*  GET /user/:user_id/current
*  Get shift record if user is currently clocked in.
*  If not clocked in, determine user was clocked in earlier
*  in the day.
*  Return
*    if user currently clocked in
*      200: {
*        current_shift: { id, start, ... }
*      }
*    if user not currently clocked in
*      200: {
*        current_shift: null,
*        previous_shift_today: true / false
*      }
*
select id, user_id, role_id, start_time, end_time from shifts
http GET localhost:3000/shifts/user/2/current
***************************************************** */
router.get('/user/:user_id/current', (req, res, next) => {
  console.log("-- GET route shifts/user/:id/current: ", req.params.id);

  // check if user is currently clocked into a shift
  knex('shifts')
    .where('user_id', req.params.user_id)
    .where('start_time', ">", getDateToday())
    .whereNull('end_time')
    .then((aRecs) => {
      console.log("--> qry returning: ", aRecs);

      // user is currently clocked in
      if (aRecs.length !== 0) {
        res.status(200).json({ current_shift: aRecs[0] });
        return;
      }

      // not clocked in, check if volunteer clocked in earlier in the day
      knex("shifts")
        .where('user_id', req.params.user_id)
        .where('start_time', ">", getDateToday())
        .whereNotNull('end_time')
        .then((aEarlierRecs) => {
          console.log("** aRecs testing shift earlier today: ", aEarlierRecs);

          // clocked in earlier in the day
          if (aEarlierRecs.length) {
            res.status(200).json({ current_shift: "null", previous_shift_today: true });
            return;
          }

          // not clocked in earlier in the today
          res.status(200).json({ current_shift: "null", previous_shift_today: false });
        });
    })
    .catch((error) => {
      console.log("%%% knex:r/user/:user_id/current :", error);
      throw new Error(error.message); // set Error object to call stack rather than knex internals
    });
});


/* **************************************************
*  GET /user/:user_id
*  Get shift history for user
*  Return
*      200: {
*         shifts: [ { id, start, … }, { id, start, ... } ]
*         }
*      404: {
*         shifts: "null",
*         message: "no history for user"
*         }
*
http GET localhost:3000/shifts/user/2
***************************************************** */
router.get('/user/:user_id', (req, res, next) => {
  console.log("-- GET route shifts/user/:id: ", req.params.user_id);

  // get all past shifts for user
  knex('shifts')
    .where('user_id', req.params.user_id)
    .then((aRecs) => {
      console.log("--> qry returning: ", aRecs);

      // user has no history
      if (aRecs.length === 0) {
        res.status(200).json({ shifts: "null", message: `user ${req.params.user_id} has no shift history` });
        return;
      }
      // return user's shift history
      res.status(200).json({ shifts: aRecs });
      return;
    })
    .catch((error) => {
      console.log("%%% knex:shifts/user/:id :", error);
      throw new Error(error.message); // set Error object to call stack rather than knex internals
    });
});

/* **************************************************
*  POST /
*  Clock-in, add a new shift record
*  @body user_id
*  @body role_id
*  @body miles
*  return
http POST localhost:3000/shifts user_id=4 role_id=3 miles=99
***************************************************** */
router.post('', (req, res, next) => {
  console.log("-- POST route shifts/user/:id: ", req.params.user_id);
  const oParams = {
    user_id: 'int',
    role_id: 'int',
    miles: 'string',
  };
  if (!chkBodyParams(oParams, req, res, next))
    return;
  const oShift = {
    // id: not-passed-to-create-new-record
    user_id: req.body.user_id,
    role_id: req.body.role_id,
    miles: req.body.miles,
    start_time: new Date(),
    // end_time: null until user clocks-out
  };

  // check that volunteer isn't already clocked in
  knex('shifts')
    .where('user_id', req.body.user_id)
    .where('start_time', ">", getDateToday())
    .whereNull('end_time')
    .then((aRecs) => {
      if (aRecs.length) {
        console.log("-- error, user already clocked in");
        const error = new Error(`unable to clock-in, already clocked in, shifts.id: ${aRecs[0].id}`);
        error.status = 401;
        throw error; // send to .catch() below.
                     // MUST throw to prevent following .then()'s from executing
      }
    })
    // clock-in / post new shift
    .then(() => {
      knex('shifts')
        .insert([oShift]) // param is in the format of the fields so use destructuring
        .returning('*') // gets array of the inserted records
        .then((aRecs) => {
          console.log("--> create returning: ", aRecs);
          res.status(201).json({ shift: aRecs[0] });
          return;
        });
    })
    .catch((error) => {
      error.status = error.status || 500;
      console.log("--- route shifts/user/:id, error: ", error);
      next(error);
    });

});

module.exports = router;