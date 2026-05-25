import React from 'react';
import './Tile.css';

const Tile = ({ char, type, subType }) => {
  // Determine CSS classes based on tile type and subType
  const classes = ['tile-text', `tile-${type}`];
  if (subType) {
    classes.push(`tile-sub-${subType}`);
  }

  return (
    <div className="tile">
      <span className={classes.join(' ')}>
        {char}
      </span>
    </div>
  );
};

export default Tile;
