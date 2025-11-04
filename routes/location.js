const express = require("express");
const router = express.Router();
const locationController = require("../controllers/locationController");

// Public: list states and lgas
router.get("/states", locationController.listStates);
router.get("/lgas/:state_id", locationController.listLgas);

// Get a single state
router.get("/states/:id", locationController.getState);

// Get a single LGA
router.get("/lgas/lga/:id", locationController.getLga);

// Search for locations
router.get("/search", locationController.searchLocations);

// List all LGAs
router.get("/lgas", locationController.listAllLgas);

// Get all states with their LGAs
router.get("/states-with-lgas", locationController.listStatesWithLgas);

module.exports = router;
