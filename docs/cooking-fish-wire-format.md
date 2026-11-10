# Cooking and training-port wire fields

These fields were checked against the public AArch64 client library at
https://github.com/GetherAround/GrowtopiaLib/blob/main/libgrowtopia.so
(SHA256 `f20474ddd908f319d50f607daba3fafd227548bb85c8b99b2f30fe7e48f91996`).
Addresses below refer to that library, not necessarily the installed client version.

## Ovens

`Tile::GetOvenString` (`0xa61c8c`) reads the heat as an integer, compares it
against **3** for Low and **6** for Medium, and otherwise displays High.
The matching string addresses are `0x15d7590`, `0x15d75a3`, and `0x15d75bd`.
Use integer rates 0/3/6/9 on the wire; keep server cooking multipliers 0/1/2/3.
Neither integer multipliers 1/2/3 nor IEEE float encodings are valid heat rates.

`TileExtra::FinalizeGrowth` (`0xa67988`, oven branch `0xa67bf4`) adds
`heatRate * elapsedSeconds` to each ingredient's accumulated heat.
`GetOvenString` compares that accumulated integer against the item's cook time.
Serialize each ingredient as `floor(lowHeatElapsedMsSinceInsertion * 3 / 1000)`.
The snapshot timer is zero because the accumulated heat already includes elapsed
time; the client then advances it locally. The final u64 is the Unix start time.

## Training ports

`TileExtra::Serialize` (`0xa63d84`, training branch `0xa65800`) reads the
35-byte payload after the extra-type byte. The two bytes after fish weight
go to separate sick and dead booleans, not a u16 hunger/status enum.

`Fish::Render` (`0xd6a2cc`, relevant branch `0xd6a480`) chooses the dead
appearance if the dead byte is nonzero, sick if the sick byte is nonzero,
hungry if the following progress field is nonzero, and normal otherwise.
The final payload byte is separate from these flags. Fullness is server state;
never write its numeric enum into either health flag.

Unit tests cover the wire bytes and server transitions. Live client rendering
must still be checked in-game after loading the rebuilt server.
