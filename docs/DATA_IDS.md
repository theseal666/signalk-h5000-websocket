# B&G H5000 Data ID catalog

The Data ID space is a **fixed, firmware-defined dictionary**: the same IDs mean the same
things on every H5000 CPU. Nothing about the assignment depends on how an individual
network was commissioned. The catalog's own last entry makes the design explicit — ID
`1000` is named `FirstConfigurable`, so only IDs from 1000 up are reserved for
installation-specific channels. Everything below (0–541) is a fixed vocabulary.

What *does* vary per installation is which IDs are **live**. An ID only answers when
something on the network provides its data: on the reference yacht 308 of these 522 IDs
responded, with the engine, tank, AC and charger ranges staying silent for want of those
N2K sources. That is availability, not ID assignment — so look an ID up here first, and
use the plugin's scan only to confirm that the channel actually transmits on your boat.

## Provenance

Contributed by [@voodoomatz](https://github.com/voodoomatz) in
[issue #3](https://github.com/theseal666/signalk-h5000-websocket/issues/3), from two
independent reads of the device itself:

1. extracted from the H5000 WebSocket service, then
2. re-verified against a live H5000 CPU through the service's own introspection query,
   `{"DataInfoReq":[<ids>]}` on port 2053. Every ID the device answered matched the
   catalog, the device reported zero IDs missing from it, and every gap below was
   confirmed genuinely unassigned.

Unassigned in 0–541: `2`, `16`, `75`, `76`, `100`, `101`, `102`, `103`, `104`, `120`, `129`, `216`, `239`, `250`, `251`, `252`, `257`, `307`, `308`, `430`, `431`.

## Reading the table

- **Name** is the firmware name from the service's own `eDataType` enum.
- **Short** and **Long** are the device's own display names, as `DataInfoReq` returned
  them. **Short** is what the H5000 displays and the mast plotters show, so it is the
  column to match against when you are cross-checking a channel on deck.
- `—` means the ID gave no answer on the reference installation, i.e. no data provider was
  present there. It does not mean the ID is invalid.

Two entries were corrected against the device's authoritative answer: 389 is
`AC SPD SD` (*AutoCal Speed Std Dev*) and 390 is `AC ANG SD` (*AutoCal Angle Std Dev*);
an earlier extraction had the two swapped.

## Catalog

| ID | Name | Short | Long |
|---:|---|---|---|
| 0 | ModesMessage | — | — |
| 1 | Altitude | ALTITUDE | Altitude |
| 3 | PositionError | EPE | Position Error |
| 4 | Hdop | HDOP | HDOP |
| 5 | Vdop | VDOP | VDOP |
| 6 | Tdop | TDOP | TDOP |
| 7 | Pdop | PDOP | PDOP |
| 8 | GeoidalSeperation | GSEP | Geoidal Seperation |
| 9 | Cog | COG | Course Over Ground |
| 10 | PositionQuality | POSQLT | Position Quality |
| 11 | PositionIntegrity | POSINT | Position Integrity |
| 12 | SatsInView | GPS SATS | Satellites in View |
| 13 | WaasStatus | SDGPS | SDGPS Status |
| 14 | Bearing | WPT BRG | Bearing To Waypoint |
| 15 | BearingWaypointWaypoint | — | — |
| 17 | CourseToSteer | CTS | Course To Steer |
| 18 | CrossTrack | XTE | Cross Track Error |
| 19 | VelocityMadeGood | VMG CSE | VMG to Waypoint |
| 20 | Destination | — | — |
| 21 | DistanceToTurn | WPT DIST | Distance To Waypoint |
| 22 | DistanceToDest | — | — |
| 23 | TimeToTurn | TIME TO WPT | Time to Waypoint |
| 24 | TimeToDest | — | — |
| 25 | EtaAtTurn | — | — |
| 26 | EtaAtDest | — | — |
| 27 | TotalDistance | LOG | Log |
| 28 | SteerArrow | — | — |
| 29 | Odometer | — | — |
| 30 | TripDistance | TRIP 1 | Trip 1 Distance |
| 31 | TripTime | TRIP 1 | Trip 1 Time |
| 32 | Date | DATE LOC | Local Date |
| 33 | Time | TIME LOC | Local Time |
| 34 | UtcDate | DATE UTC | UTC Date |
| 35 | UtcTime | TIME UTC | UTC Time |
| 36 | LocalTimeOffset | — | — |
| 37 | Heading | HEADING | Heading |
| 38 | Voltage | — | — |
| 39 | CurrentSet | TIDE SET | Tide Set |
| 40 | CurrentDrift | TIDE RATE | Tide Rate |
| 41 | SpeedSog | SOG | Speed Over Ground |
| 42 | SpeedWater | BOAT SPD | Boat Speed |
| 43 | SpeedPilot | — | — |
| 44 | SpeedTripAvg | AVG SPD | Trip 1 Speed Avg |
| 45 | SpeedTripMax | MAX SPD | Trip 1 Speed Max |
| 46 | SpeedWindApp | AWS | Apparent Wind Speed |
| 47 | SpeedWindTrue | TWS | True Wind Speed |
| 48 | TempWater | SEA TEMP | Sea Temperature |
| 49 | TempOutside | AIR TEMP | Air Temperature |
| 50 | TempInside | — | — |
| 51 | TempEngineRoom | — | — |
| 52 | TempMainCabin | — | — |
| 53 | TempLiveWell | — | — |
| 54 | TempBaitWell | — | — |
| 55 | TempRefrigeration | — | — |
| 56 | TempHeatingSystem | — | — |
| 57 | TempDewPoint | — | — |
| 58 | TempWindChillApp | — | — |
| 59 | TempWindChillTheoretic | — | — |
| 60 | TempHeatIndex | — | — |
| 61 | TempFreezer | — | — |
| 62 | EngineTemp | — | — |
| 63 | EngineAirTemp | — | — |
| 64 | EngineOilTemp | — | — |
| 65 | TempBattery | BATT TEMP | Battery Temperature |
| 66 | PressureAtmospheric | BAROMETER | Barometric Pressure |
| 67 | EngineBoostPres | — | — |
| 68 | EngineOilPres | — | — |
| 69 | EngineWaterPres | — | — |
| 70 | EngineFuelPres | — | — |
| 71 | EngineManifoldPres | — | — |
| 72 | PressureSteam | — | — |
| 73 | PressureComprAir | — | — |
| 74 | PressureHydraulic | — | — |
| 77 | Depth | DEPTH | Depth |
| 78 | WaterDistance | — | — |
| 79 | EngineRpm | — | — |
| 80 | EngineTrim | — | — |
| 81 | EngineAlternatorPotential | — | — |
| 82 | EngineFuelRate | — | — |
| 83 | EnginePercentLoad | — | — |
| 84 | EnginePercentTorque | — | — |
| 85 | SuzukiAlarmLevLo | — | — |
| 86 | SuzukiAlarmLevHigh | — | — |
| 87 | TankFuelLevel | — | — |
| 88 | FluidLevelFreshWater | — | — |
| 89 | FluidLevelGrayWater | — | — |
| 90 | FluidLevelLiveWell | — | — |
| 91 | FluidLevelOil | — | — |
| 92 | FluidLevelBlackWater | — | — |
| 93 | TankFuelRemaining | — | — |
| 94 | FluidVolumeFreshWater | — | — |
| 95 | FluidVolumeGrayWater | — | — |
| 96 | FluidVolumeLiveWell | — | — |
| 97 | FluidVolumeOil | — | — |
| 98 | FluidVolumeBlackWater | — | — |
| 99 | GenFluidVolume | — | — |
| 105 | GenTankCapacity | — | — |
| 106 | TankFuelCapacity | — | — |
| 107 | TankCapacityFreshWater | — | — |
| 108 | TankCapacityGrayWater | — | — |
| 109 | TankCapacityLiveWell | — | — |
| 110 | TankCapacityOil | — | — |
| 111 | TankCapacityBlackWater | — | — |
| 112 | TankFuelUsed | — | — |
| 113 | EngineFuelUsed | — | — |
| 114 | EngineFuelUsedTrip | — | — |
| 115 | EngineFuelUsedSeasonal | — | — |
| 116 | EngineFuelKValue | — | — |
| 117 | BatteryPotential | — | — |
| 118 | BatteryCurrent | CURRENT | Battery Current |
| 119 | TrimTab | TRIM TAB | Keel Trim Tab Angle |
| 121 | RateOfTurn | TURN RATE | Rate of Turn |
| 122 | AttitudeYaw | YAW | Yaw |
| 123 | AttitudePitch | TRIM | Trim |
| 124 | AttitudeRoll | — | — |
| 125 | MagneticVariation | MAG VAR | Magnetic Variation |
| 126 | Deviation | — | — |
| 127 | FuelEconomyWtr | — | — |
| 128 | FuelEconomyGps | — | — |
| 130 | FuelRangeWtr | — | — |
| 131 | FuelRangeGps | — | — |
| 132 | EngineHoursUsed | — | — |
| 133 | EngineType | — | — |
| 134 | VesselFuelRate | — | — |
| 135 | VesselFuelEconomyWtr | — | — |
| 136 | VesselFuelEconomyGps | — | — |
| 137 | VesselFuelRemaining | — | — |
| 138 | VesselFuelRangeWtr | — | — |
| 139 | VesselFuelRangeGps | — | — |
| 140 | WindAppAngle | AWA | Apparent Wind Angle |
| 141 | WindTrueAngle | TWA | True Wind Angle |
| 142 | WindTrueDirection | TWD | True Wind Direction |
| 143 | HumidityInside | — | — |
| 144 | HumidityOutside | — | — |
| 145 | SetHumidity | — | — |
| 146 | RudderAngle | RUDDER | Rudder Angle |
| 147 | TransGear | — | — |
| 148 | TransOilPressure | — | — |
| 149 | TransOilTemp | — | — |
| 150 | CmdRudderAngle | CMD RUDDER | Commanded Rudder Angle |
| 151 | RudderLimit | — | — |
| 152 | OffHeadingLim | — | — |
| 153 | RadiusOfTurnOrder | — | — |
| 154 | RateOfTurnOrder | — | — |
| 155 | OffTrackLim | — | — |
| 156 | LoggingTimeRemaining | — | — |
| 157 | PositionFixType | GPSFIX | GPS Fix Type |
| 158 | EngineDiscreteStatus | — | — |
| 159 | TransmissionDiscreteStatus | — | — |
| 160 | GpsBestOfFourSnr | — | — |
| 161 | GenFluidLevel | — | — |
| 162 | GenPressure | — | — |
| 163 | GenTemperature | — | — |
| 164 | InternalVoltage | — | — |
| 165 | DepthOffset | DEPTH OFF | Depth Offset |
| 166 | StructureDepth | — | — |
| 167 | LoranPosition | — | — |
| 168 | VesselStatus | — | — |
| 169 | BatteryDcType | — | — |
| 170 | BatteryStateOfCharge | — | — |
| 171 | BatteryStateOfHealth | — | — |
| 172 | BatteryTimeRemaining | — | — |
| 173 | BatteryRippleVoltage | — | — |
| 174 | Ac1Acceptability | — | — |
| 175 | Ac2Acceptability | — | — |
| 176 | Ac3Acceptability | — | — |
| 177 | Ac1Voltage | — | — |
| 178 | Ac2Voltage | — | — |
| 179 | Ac3Voltage | — | — |
| 180 | Ac1Current | — | — |
| 181 | Ac2Current | — | — |
| 182 | Ac3Current | — | — |
| 183 | Ac1Frequency | — | — |
| 184 | Ac2Frequency | — | — |
| 185 | Ac3Frequency | — | — |
| 186 | Ac1BreakerSize | — | — |
| 187 | Ac2BreakerSize | — | — |
| 188 | Ac3BreakerSize | — | — |
| 189 | Ac1RealPower | — | — |
| 190 | Ac2RealPower | — | — |
| 191 | Ac3RealPower | — | — |
| 192 | Ac1ReactivePower | — | — |
| 193 | Ac2ReactivePower | — | — |
| 194 | Ac3ReactivePower | — | — |
| 195 | Ac1PowerFactor | — | — |
| 196 | Ac2PowerFactor | — | — |
| 197 | Ac3PowerFactor | — | — |
| 198 | SwitchState | — | — |
| 199 | SwitchCurrent | — | — |
| 200 | SwitchFault | — | — |
| 201 | SwitchDimLevel | — | — |
| 202 | PreviousCmdHeading | — | — |
| 203 | CmdWindAngle | — | — |
| 204 | CmdBearingOffset | — | — |
| 205 | CmdBearing | — | — |
| 206 | CmdDepthContour | — | — |
| 207 | CmdCourseChange | — | — |
| 208 | PilotDrift | — | — |
| 209 | PilotDistanceToTurn | — | — |
| 210 | PilotTimeToTurn | — | — |
| 211 | PilotReferencePosition | — | — |
| 212 | DcStatus | — | — |
| 213 | AcStatus | — | — |
| 214 | SwitchVoltage | — | — |
| 215 | BatteryCapacityRemaining | — | — |
| 217 | BandGLinear1 | USER 1 | User 1 |
| 218 | BandGLinear2 | USER 2 | User 2 |
| 219 | BandGLinear3 | USER 3 | User 3 |
| 220 | BoomPosition | BOOM POS | Boom Position |
| 221 | SailingCourse | COURSE | Course |
| 222 | DaggerboardPosition | DAGGER | Daggerboard Position |
| 223 | BandGLinear4 | USER 4 | User 4 |
| 224 | HeadingOnNextTack | OPP HDG | Heading Opposite Tack |
| 225 | KeelAngle | KEEL ANG | Keel Angle |
| 226 | Leeway | LEEWAY | Signed Leeway Angle |
| 227 | MastAngle | MAST ANG | Mast Angle |
| 228 | TargetTrueWindAngle | TARG TWA | Target TWA |
| 229 | KeelTrimTab | — | — |
| 230 | RaceTimer | TIMER | Race Timer |
| 231 | CanardAngle | CANARD | Canard Angle |
| 232 | NextLegApparentWindAngle | NL AWA | Next Leg AWA |
| 233 | NextLegApparentWindSpeed | NL AWS | Next Leg AWS |
| 234 | TargetBoatSpeed | TARG SPD | Target Boat Speed |
| 235 | VmgToWind | VMG | Velocity Made Good |
| 236 | TimeToLaylines | LL TIME | Layline Time |
| 237 | DistanceToLaylines | — | — |
| 238 | AftDepth | AFT DEPTH | Aft Depth |
| 240 | PolarSpeed | POL SPD | Polar Speed |
| 241 | PolarPerformance | POL PERF | Polar Performance |
| 242 | TackingPerformance | — | — |
| 243 | WindAngleToMast | MAST AWA | Wind Angle to Mast |
| 244 | CanBusVoltage | — | — |
| 245 | InternalTemperature | — | — |
| 246 | EngageCurrent | — | — |
| 247 | UrefVoltage | — | — |
| 248 | SupplyVoltage | — | — |
| 249 | DestinationPosition | — | — |
| 253 | EngineGeneralMaintenance | — | — |
| 254 | EnginePercentThrottle | — | — |
| 255 | EngineSteeringAngle | — | — |
| 256 | EngineBreakInReqd | — | — |
| 258 | EngineBreakInAccum | — | — |
| 259 | EngineTrimStatus | — | — |
| 260 | PilotPresent | — | — |
| 261 | Ac1OutWaveform | — | — |
| 262 | Ac2OutWaveform | — | — |
| 263 | Ac3OutWaveform | — | — |
| 264 | Ac1OutVoltage | — | — |
| 265 | Ac2OutVoltage | — | — |
| 266 | Ac3OutVoltage | — | — |
| 267 | Ac1OutCurrent | — | — |
| 268 | Ac2OutCurrent | — | — |
| 269 | Ac3OutCurrent | — | — |
| 270 | Ac1OutFrequency | — | — |
| 271 | Ac2OutFrequency | — | — |
| 272 | Ac3OutFrequency | — | — |
| 273 | Ac1OutBreakerSize | — | — |
| 274 | Ac2OutBreakerSize | — | — |
| 275 | Ac3OutBreakerSize | — | — |
| 276 | Ac1OutRealPower | — | — |
| 277 | Ac2OutRealPower | — | — |
| 278 | Ac3OutRealPower | — | — |
| 279 | Ac1OutReactivePower | — | — |
| 280 | Ac2OutReactivePower | — | — |
| 281 | Ac3OutReactivePower | — | — |
| 282 | Ac1OutPowerFactor | — | — |
| 283 | Ac2OutPowerFactor | — | — |
| 284 | Ac3OutPowerFactor | — | — |
| 285 | Ac2Status | — | — |
| 286 | Ac3Status | — | — |
| 287 | Ac1OutStatus | — | — |
| 288 | Ac2OutStatus | — | — |
| 289 | Ac3OutStatus | — | — |
| 290 | SwitchManualOverride | — | — |
| 291 | SwitchReversePolarity | — | — |
| 292 | SwitchAcsourceAvailable | — | — |
| 293 | SwitchAccontactorSystemsonstate | — | — |
| 294 | ChargerBatteryInstance | — | — |
| 295 | ChargerOperatingState | — | — |
| 296 | ChargerMode | — | — |
| 297 | ChargerEnabled | — | — |
| 298 | ChargerEqualizationPending | — | — |
| 299 | ChargerEqualizationTimeRemaining | — | — |
| 300 | InverterAcInstance | — | — |
| 301 | InverterDcInstance | — | — |
| 302 | InverterOperatingState | — | — |
| 303 | InverterEnabled | — | — |
| 304 | SailingTimeToWaypoint | TTW-S | Sailing Time to Waypoint |
| 305 | SailingDistanceToWaypoint | DTW-S | Sailing Distance to Waypoint |
| 306 | SailingEstimateTimeOfArrival | ETA-S | Sailing ETA |
| 309 | Latitude | BOW POS LAT | Bow Position Latitude |
| 310 | Longitude | BOW POS LON | Bow Position Longitude |
| 311 | Backstay | BACKSTAY | Backstay |
| 312 | BoomAngle | BOOM ANG | Boom Angle |
| 313 | BoomVang | BOOM VANG | Boom Vang |
| 314 | ChainLength | CHAIN | Chain Length |
| 315 | Course | BWW | Bearing Waypoint To Waypoint |
| 316 | Cunningham | CUNINGHAM | Cunningham |
| 317 | DeadReckoningBearing | DR BRG | Dead Reckoning Bearing |
| 318 | DeadReckoningDistance | DR DST | Dead Reckoning Distance |
| 319 | DistanceToPortEnd | SL DST-P | Start Line Distance To Port |
| 320 | DistanceToStarboardEnd | SL DST-S | Start Line Distance To Starboard |
| 321 | DistanceToStartLine | SL DIST | Distance To Start Line |
| 322 | GroundWindAngle | GWA | Ground Wind Angle |
| 323 | GroundWindDirection | GWD | Ground Wind Direction |
| 324 | GroundWindSpeed | GWS | Ground Wind Speed |
| 325 | AttitudeHeel | HEEL | Heel |
| 326 | InnerForestay | INFSTY | Inner Forestay Load |
| 327 | InnerForestayHalyard | INFSTY H | Inner Forestay Halyard Load |
| 328 | JibFurl | JIB FURL | Jib Furl |
| 329 | JibHalyard | JIB HLYD | Jib Halyard Load |
| 330 | LaylineDistance | LL DIST | Layline Distance |
| 331 | MeasuredWindAngle | AWA | Apparent Wind Angle |
| 332 | MeasuredWindSpeed | AWS | Apparent Wind Speed |
| 333 | MobDrBearing | MOB BRG | MOB DR Bearing |
| 334 | MobDrDistance | MOB RANGE | MOB DR Range |
| 335 | OffCourse | OFF COURSE | Off Course |
| 336 | OptimumWindAngle | OPT TWA | Optimum Wind Angle |
| 337 | Outhaul | OUTHAUL | Outhaul Load |
| 338 | PitchRate | PITCH | Pitch Rate |
| 339 | PlowAngle | PLOW ANG | Plow Angle |
| 340 | PortEndLatitude | SL POS-P LAT | Start Line Port Position Latitude |
| 341 | PortEndLongitude | SL POS-P LON | Start Line Port Position Longitude |
| 342 | RemoteChannel1 | REMOTE 1 | Remote 1 |
| 343 | RemoteChannel2 | REMOTE 2 | Remote 2 |
| 344 | RemoteChannel3 | REMOTE 3 | Remote 3 |
| 345 | RemoteChannel4 | REMOTE 4 | Remote 4 |
| 346 | RemoteChannel5 | REMOTE 5 | Remote 5 |
| 347 | RemoteChannel6 | REMOTE 6 | Remote 6 |
| 348 | RemoteChannel7 | REMOTE 7 | Remote 7 |
| 349 | RemoteChannel8 | REMOTE 8 | Remote 8 |
| 350 | RemoteChannel9 | REMOTE 9 | Remote 9 |
| 351 | RollRate | ROLL | Roll Rate |
| 352 | StarboardEndLatitude | SL POS-S LAT | Start Line Starboard Position Latitude |
| 353 | StarboardEndLongitude | SL POS-S LON | Start Line Starboard Position Longitude |
| 354 | StartLineBias | SL BIAS | Start Line Bias |
| 355 | Trip2Time | TRIP 2 | Trip 2 Time |
| 356 | Trip2Distance | TRIP 2 | Trip 2 Distance |
| 357 | VmgPerformance | VMG PERF | VMG Performance |
| 358 | VmgToWaypoint | VMG CSE | VMG to Waypoint |
| 359 | YawRate | YAW | Yaw Rate |
| 360 | SpeedTrip2Avg | AVG SOG | Trip 2 Speed Avg |
| 361 | SpeedTrip2Max | MAX SOG | Trip 2 Speed Max |
| 362 | DestinationWaypointLatitude | DEST POS LAT | Destination Position Latitude |
| 363 | DestinationWaypointLongitude | DEST POS LON | Destination Position Longitude |
| 364 | BandGLinear5 | USER 5 | User 5 |
| 365 | BandGLinear6 | USER 6 | User 6 |
| 366 | BandGLinear7 | USER 7 | User 7 |
| 367 | BandGLinear8 | USER 8 | User 8 |
| 368 | BandGLinear9 | USER 9 | User 9 |
| 369 | BandGLinear10 | USER 10 | User 10 |
| 370 | BandGLinear11 | USER 11 | User 11 |
| 371 | BandGLinear12 | USER 12 | User 12 |
| 372 | BandGLinear13 | USER 13 | User 13 |
| 373 | BandGLinear14 | USER 14 | User 14 |
| 374 | BandGLinear15 | USER 15 | User 15 |
| 375 | BandGLinear16 | USER 16 | User 16 |
| 376 | TimeToPortLayline | LL TIME-P | Time to Port Layline |
| 377 | TimeToStbdLayline | LL TIME-S | Time to Starboard Layline |
| 378 | DistanceToPortLayline | LL DST-P | Distance To Port Layline |
| 379 | DistanceToStbdLayline | LL DST-S | Distance To Starboard Layline |
| 380 | StartLineBearing | SL BRG | Start Line Bearing |
| 381 | BoatLengthAdvantage | SL ADV | Bias Advantage BL |
| 382 | DistanceToStartLineBoatLengths | SL DIST | Distance To Start Line (Boat Lengths) |
| 383 | TWACorrection | TWA CORR | TWA Correction |
| 384 | TWSCorrection | TWS CORR | TWS Correction |
| 385 | RedPhase | RED | Red Phase |
| 386 | GreenPhase | GREEN | Green Phase |
| 387 | BluePhase | BLUE | Blue Phase |
| 388 | AutocalQuality | AC RUN Q | AutoCal Run Quality |
| 389 | AutocalSpeedStdDev *(corrected — see note)* | AC SPD SD | AutoCal Speed Std Dev |
| 390 | AutocalAngleStdDev *(corrected — see note)* | AC ANG SD | AutoCal Angle Std Dev |
| 391 | PerpendicularPassed | PERP | Perpendicular Passed |
| 392 | ArrivalCircleEntered | ARRIVAL | Arrival Circle Entered |
| 393 | Forestay | FORESTAY | Forestay |
| 394 | KeelPosition | KEEL POS | Keel Position |
| 395 | PoolTemp | POOL | Pool Temp |
| 396 | InternalTemp | INT TEMP | Internal Temp |
| 397 | JacuzziTemp | JACUZZI | Jacuzzi Temp |
| 398 | Analogue1 | ANALOG 1 | Analogue Channel 1 |
| 399 | Analogue2 | ANALOG 2 | Analogue Channel 2 |
| 400 | Analogue3 | ANALOG 3 | Analogue Channel 3 |
| 401 | Analogue4 | ANALOG 4 | Analogue Channel 4 |
| 402 | TargetWaypointName | DEST | Destination |
| 403 | BoatSpeedCorrection | BS CORR | Boat Speed Correction |
| 404 | CorrectedMWS | CORR MWS | Corrected MWS |
| 405 | CorrectedMWA | CORR MWA | Corrected MWA |
| 406 | OriginalTWS | O TWS | Orig TWS |
| 407 | OriginalTWA | O TWA | Orig TWA |
| 408 | OriginalTWD | O TWD | Orig TWD |
| 409 | MeasuredBoatSpeed | MEAS BS | Measured Boat Speed |
| 410 | UncorrectedLog1 | ULOG 1 | Uncorrected Log 1 |
| 411 | UncorrectedLog2 | ULOF 2 | Uncorrected Log 2 |
| 412 | CodeZero | CODEZERO | Code Zero Load |
| 413 | TimeToStartLine | SL TIME | Time to Start Line |
| 414 | DistanceBehindStartLine | SL B DIST | Distance Behind Start Line |
| 415 | DistanceBehindStartLineBoatLengths | SL B DIST | Distance Behind Start Line (Boat Lengths) |
| 416 | MobDrLatitude | MOB DR LAT | MOB DR Position Latitude |
| 417 | MobDrLongitude | MOB DR LON | MOB DR Position Longitude |
| 418 | MobLatitude | MOB POS LAT | MOB Position Latitude |
| 419 | MobLongitude | MOB POS LON | MOB Position Longitude |
| 420 | BiasAdvantage | BIAS ADV | Bias Advantage |
| 421 | GpsPositionLatitude | GPS POS LAT | GPS Position Latitude |
| 422 | GpsPositionLongitude | GPS POS LON | GPS Position Longitude |
| 423 | StartLineLength | SL LEN | Start Line Length |
| 424 | BearingToStarboardEnd | SL BRNG-S | Start Line Bearing To Starboard |
| 425 | OppositeTackCog | OPP COG | Opposite Tack COG |
| 426 | OppositeTackTargetHeading | OPP TARG | Opposite Tack Target Heading |
| 427 | MastRake | MST RAKE | Mast Rake |
| 428 | NextLegBearing | NL BRG | Next Leg Bearing |
| 429 | NextLegTargetSpeed | NL SPD | Next Leg Target Speed |
| 432 | MastCantAngle | MST CANT | Mast Cant Angle |
| 433 | RudderToeIn | RUD TOE | Rudder Toe In |
| 434 | DaggerboardPort | DAGGER P | Daggerboard Port |
| 435 | DaggerboardStarboard | DAGGER S | Daggerboard Starboard |
| 436 | RemoteChannel0 | REMOTE 0 | Remote 0 |
| 437 | MeasuredBoatSpeed1 | MEAS BS P | Measured Boat Speed Port |
| 438 | MeasuredBoatSpeed2 | MEAS BS S | Measured Boat Speed Starboard |
| 439 | AverageWindDirection | AVE TWD | Average True Wind Direction |
| 440 | WindPhase | W PHASE | Wind Phase |
| 441 | WindLift | LIFT | Wind Lift |
| 442 | Bobstay | BOBSTAY | Bobstay |
| 443 | J1 | J1 | J1 |
| 444 | J2 | J2 | J2 |
| 445 | J3 | J3 | J3 |
| 446 | MastBase | MAST BASE | Mast Base |
| 447 | Mainsheet | MAINSHEET | Mainsheet |
| 448 | D0Port | D0 PORT | D0 Port |
| 449 | D0Starboard | D0 STBD | D0 Starboard |
| 450 | RunnerPort | RUNNER P | Runner Port |
| 451 | RunnerStarboard | RUNNER S | Runner Starboard |
| 452 | FoilPort | FOIL P | Foil Port |
| 453 | FoilStarboard | FOIL S | Foil Starboard |
| 454 | SailTackPort | S TACK P | Sail Tack Port |
| 455 | SailTackStarboard | S TACK S | Sail Tack Starboard |
| 456 | DeflectPort | DFL PORT | Deflect Port |
| 457 | DeflectStarboard | DFL STBD | Deflect Starboard |
| 458 | RudderPort | RUD LD P | Rudder Load Port |
| 459 | RudderStarboard | RUD LD S | Rudder Load Starboard |
| 460 | D1Port | D1 PORT | D1 Port |
| 461 | D1Starboard | D1 STBD | D1 Starboard |
| 462 | V0Port | V0 PORT | V0 Port |
| 463 | V0Starboard | V0 STBD | V0 Starboard |
| 464 | V1Port | V1 PORT | V1 Port |
| 465 | V1Starboard | V1 STBD | V1 Starboard |
| 466 | SignedLeeway | LEEWAY | Signed Leeway Angle |
| 467 | DistanceToStartPortEndBoatLengths | SL DST-P | Start Line Distance To Port (Boat Lengths) |
| 468 | DistanceToStartStarboardEndBoatLengths | SL DST-S | Start Line Distance To Starboard (Boat Lengths) |
| 469 | ReacherLoad | REACHER | Reacher Load |
| 470 | BladeLoad | BLADE | Blade Load |
| 471 | StaysailLoad | STAYSAIL | Staysail Load |
| 472 | TackLoad | TACK | Tack Load |
| 473 | J4Load | J4 | J4 Load |
| 474 | SolentLoad | SOLENT | Solent Load |
| 475 | TackPortLoad | TACK P | Tack Port Load |
| 476 | TackStarboardLoad | TACK S | Tack Starboard Load |
| 477 | DeflectUpperLoad | DFL UP | Deflect Upper Load |
| 478 | DeflectLowerLoad | DFL LOW | Deflect Lower Load |
| 479 | WinchPortLoad | WINCH P | Winch Port Load |
| 480 | WinchStarboardLoad | WINCH S | Winch Starboard Load |
| 481 | BandGLinear17 | USER 17 | User 17 |
| 482 | BandGLinear18 | USER 18 | User 18 |
| 483 | BandGLinear19 | USER 19 | User 19 |
| 484 | BandGLinear20 | USER 20 | User 20 |
| 485 | BandGLinear21 | USER 21 | User 21 |
| 486 | BandGLinear22 | USER 22 | User 22 |
| 487 | BandGLinear23 | USER 23 | User 23 |
| 488 | BandGLinear24 | USER 24 | User 24 |
| 489 | BandGLinear25 | USER 25 | User 25 |
| 490 | BandGLinear26 | USER 26 | User 26 |
| 491 | BandGLinear27 | USER 27 | User 27 |
| 492 | BandGLinear28 | USER 28 | User 28 |
| 493 | BandGLinear29 | USER 29 | User 29 |
| 494 | BandGLinear30 | USER 30 | User 30 |
| 495 | BandGLinear31 | USER 31 | User 31 |
| 496 | BandGLinear32 | USER 32 | User 32 |
| 497 | SpeedThroughWater | WATER SPD | Speed Through Water |
| 498 | PilotActivePerfMode | ACTIVE PERF | Pilot Active Perf Mode |
| 499 | PilotGust | GUST BA | Pilot Gust Bear Away |
| 500 | PilotTwsResponse | TWS BA | Pilot TWS Bear Away |
| 501 | PilotHeelComp | HEEL COMP | Pilot Heel Compensation |
| 502 | PilotNetCourse | NET CRSE | Pilot Net Course |
| 503 | PilotTargetWindAngle | PLT TARG WA | Pilot Target Wind Angle |
| 504 | PilotWeatherHelm | PLT WHELM | Pilot Weather Helm |
| 505 | PilotMeanHeel | PLT AVG HEEL | Pilot Mean Heel |
| 506 | SpinnakerHalyardPort | SPIN P | Spinnaker Halyard Port Load |
| 507 | SpinnakerHalyardStbd | SPIN S | Spinnaker Halyard Stbd Load |
| 508 | MainHalyard | MAIN HLD | Main Halyard Load |
| 509 | Load1 | LOAD 1 | Load 1 |
| 510 | Load2 | LOAD 2 | Load 2 |
| 511 | MastBase2 | MAST BASE 2 | Mast Base 2 Load |
| 512 | WirelessSignalStrength | SIGNAL STR | Wireless Signal Strength |
| 513 | WirelessBatteryStatus | BATTERY % | Wireless Battery Status |
| 514 | WirelessBatteryChargeStatus | BATTERY CHRG | Wireless Battery Charge |
| 515 | WirelessSoftwareUpdate | S/W UPDATE | Wireless Software Update |
| 516 | DerivedDataDampedHeading | DD HEADING | Derived Damped Heading |
| 517 | DerivedDataRawCourse | DD COURSE | Derived Raw Course |
| 518 | DerivedDataDampedHeel | DD HEEL | Derived Data Damped Heel |
| 519 | DerivedDataDampedTrim | DD TRIM | Derived Data Damped Trim |
| 520 | CurrentTack | CURR TACK | Current Tack |
| 521 | DerivedDataDampedBoatSpeed | DD BSPD | Derived Damped Boat Speed |
| 522 | DerivedDataDampedTrueWindAngle | DD TWA | Derived Damped True Wind Angle |
| 523 | DerivedDataDampedTrueWindSpeed | DD TWS | Derived Damped True Wind Speed |
| 524 | BoatSpeedCalibrationCurrentRunDistance | RUN DIST | Boat Speed Calibration Run Distance |
| 525 | BearingToPortEnd | SL BRNG-P | Start Line Bearing To Port |
| 526 | Analogue5 | ANALOG 5 | Analogue Channel 5 |
| 527 | Analogue6 | ANALOG 6 | Analogue Channel 6 |
| 528 | Analogue7 | ANALOG 7 | Analogue Channel 7 |
| 529 | Analogue8 | ANALOG 8 | Analogue Channel 8 |
| 530 | Analogue9 | ANALOG 9 | Analogue Channel 9 |
| 531 | AuxTemp | AUX TEMP | Auxillary Temperature |
| 532 | MeasuredWindAngle1 | MWA 1 | Measured Wind Angle 1 |
| 533 | MeasuredWindSpeed1 | MWS 1 | Measured Wind Speed 1 |
| 534 | MeasuredWindAngle2 | MWA 2 | Measured Wind Angle 2 |
| 535 | MeasuredWindSpeed2 | MWS 2 | Measured Wind Speed 2 |
| 536 | TimeToBurn | TT Burn | Time To Burn |
| 537 | MastTwist | M Twist | Mast Twist |
| 538 | PortEndPingTime | P PING TIME | Port End Ping Time |
| 539 | StbdEndPingTime | S PING TIME | Starboard End Ping Time |
| 540 | TargetsTWS | T TWS | Targets True Wind Speed |
| 541 | Last | — | — |
| 1000 | FirstConfigurable | — | — |
