import Tile from './Tile';
import './TileMap.css';

const TileMap = ({ grid }) => {
  if (!grid || grid.length === 0) {
    return <div className="tilemap-loading">Generating Dungeon...</div>;
  }

  return (
    <div className="tilemap-container">
      <div 
        className="tilemap" 
        style={{
          gridTemplateColumns: `repeat(${grid[0].length}, var(--tile-size))`,
          gridTemplateRows: `repeat(${grid.length}, var(--tile-size))`
        }}
      >
        {grid.map((row, rowIndex) => 
          row.map((tile, colIndex) => (
            <Tile 
              key={`${rowIndex}-${colIndex}`} 
              char={tile.char} 
              type={tile.type}
              subType={tile.subType}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default TileMap;
