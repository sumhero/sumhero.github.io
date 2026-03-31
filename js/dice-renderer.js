const DiceRenderer = {
    dotPositions: {
        1: [[50, 50]],
        2: [[25, 25], [75, 75]],
        3: [[25, 25], [50, 50], [75, 75]],
        4: [[25, 25], [75, 25], [25, 75], [75, 75]],
        5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
        6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
    },

    render(value, size = 120) {
        const dots = this.dotPositions[value] || [];
        const dotRadius = size * 0.1;
        const svgDots = dots.map(([x, y]) =>
            '<circle cx="' + (x / 100 * size) + '" cy="' + (y / 100 * size) + '" r="' + dotRadius + '" fill="#333"/>'
        ).join('');

        return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" class="dice-enter">' +
            '<rect x="2" y="2" width="' + (size - 4) + '" height="' + (size - 4) + '" rx="' + (size * 0.12) + '" fill="white" stroke="#ccc" stroke-width="2"/>' +
            svgDots +
            '</svg>';
    },
};
