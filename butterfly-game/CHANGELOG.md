# Le Chasseur de Papillons - Changelog

## Version 1.5.1
- Countdown now only appears at the start of the game, not for each wave
- Reset countdown flag when starting a new game
- Maintained all performance improvements for smooth gameplay

## Version 1.5.0
- Completely redesigned butterfly movement for better performance
- Added exciting 3-second countdown before the game begins
- Fun messages during countdown: "Butterflies incoming!", "Get your net ready!", "Catch them all!"
- Each butterfly now flies from a random edge through a random point on screen
- Simplified movement patterns to prevent lag with many butterflies
- Reduced butterfly count (40 per wave) to improve performance
- Staggered butterfly spawning to reduce initial lag spike
- Butterflies no longer follow formations but create a more natural migration effect
- Prevented clicking during countdown for better gameplay flow
- Semi-transparent overlay during countdown for better visibility

## Version 1.4.0
- Significantly faster-paced gameplay with quick wave transitions
- Each level now mixes butterflies from current and previous levels:
  - Level 1: 100% level 1 butterflies
  - Level 2: 75% level 2 + 25% level 1 butterflies
  - Level 3+: 60% current level + 25% previous level + 15% two levels back
- Fixed total butterfly count per wave for more consistent gameplay
- Each wave has a mix of butterfly types with different speeds, sizes, and movement patterns
- Shorter transitions between waves and levels for faster gameplay
- Less intrusive wave completion notifications
- Butterflies from higher levels move faster (10% speed increase per level)
- Formation sizes adjusted to balance different butterfly types
- Faster transitions after completing all waves in a level

## Version 1.3.0
- MASSIVELY increased the number of butterflies on screen
- Reduced to 3 waves per level for more intense gameplay
- Made butterflies fly at different speeds within each formation
- Created a true migration effect - butterflies now cross through the screen once and exit
- Multiple formations now spawn in each wave (2-5 formations per wave)
- Added surprise formations that occasionally appear during gameplay
- Butterflies now get a speed boost when crossing the screen
- Added tracking to ensure butterflies always cross through visible screen area
- Increased base size of butterflies for better visibility
- More variation in butterfly counts based on formation type

## Version 1.2.0
- Added wave system with butterflies to catch
- Implemented butterfly formations for more interesting patterns:
  - Line formation: butterflies in a horizontal or vertical line
  - V formation: butterflies in a V or inverted V shape
  - Circle formation: butterflies in a circular pattern
  - Grid formation: butterflies in a grid pattern
  - Random formation: butterflies randomly positioned
- Made butterflies fly through the screen in organized migrations
- Increased difficulty progression:
  - Butterflies get smaller at higher levels
  - Faster movement at higher levels
  - Smaller catch radius at higher levels
  - More complex formations at higher levels
- Added wave and level information display
- Increased the number of butterflies per wave based on level

## Version 1.1.0
- Replaced separate butterfly net with the character's built-in net
- Added French cafe music as background
- Added "Wee Wee" sound when clicking Start Game button
- Removed catch sound effect
- Improved butterfly movement patterns:
  - Added 5 new movement patterns (wave, diagonal, figure8, spiral, chase)
  - Made butterflies fly more consistently across the screen
  - Enhanced existing movement patterns for more interesting gameplay
- Fixed level progression issue that caused game to freeze
- Limited maximum level to 10 to match available butterfly assets
- Added safeguards to prevent multiple level transitions
- Made character larger and more visible

## Version 1.0.0
- Initial game implementation
- Basic gameplay with 5 butterfly movement patterns
- Level progression system
- Score tracking
- Start and end screens