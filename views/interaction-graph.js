import state from '../core/state.js';
import db from '../core/db.js';
import { interactionGraph } from '../services/InteractionGraph.js';

export default class InteractionGraphView {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'interaction-graph-root w-full h-full relative bg-surface overflow-hidden';
        this.simulation = null;
        this.svg = null;
    }

    async render() {
        this.container.innerHTML = `
            <div class="glass-panel" style="position: absolute; top: 0; left: 0; right: 0; padding: max(env(safe-area-inset-top), 20px) 24px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 10;">
                <a href="#/dashboard" class="glass-btn" style="width: 44px; height: 44px; text-decoration: none; display: flex; justify-content: center; align-items: center;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </a>
                <div style="font-weight: 600; letter-spacing: 0.1em; color: var(--text-primary); font-size: 14px; text-transform: uppercase;">Interaction Graph</div>
                <div style="width: 44px;"></div>
            </div>
            <div id="d3-container" class="w-full h-full flex justify-center items-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
            <div class="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-surface-elevated/80 backdrop-blur-xl border border-white/10 shadow-2xl z-10 text-sm">
                <div class="flex items-center gap-2 mb-2">
                    <span class="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                    <span class="text-text-primary font-semibold">Major Contraindication</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span class="text-text-secondary">Safe Medication</span>
                </div>
            </div>
        `;
        
        // Wait for D3
        await this._loadD3();
        await this._initGraph();
        
        return this.container;
    }

    _loadD3() {
        return new Promise((resolve) => {
            if (window.d3) return resolve();
            const script = document.createElement('script');
            script.src = 'https://d3js.org/d3.v7.min.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }

    async _initGraph() {
        const container = this.container.querySelector('#d3-container');
        container.innerHTML = ''; // clear spinner

        // Fetch user and family medications
        const uid = state.user?.uid;
        if (!uid) return;

        const meds = await db.medications.getAll();
        
        // Use existing interactionGraph service to find interactions
        // For visual sake, let's create a D3 data structure
        const nodes = meds.map(m => ({ id: m.id, name: m.medicationName, group: 1 }));
        const links = [];

        for (let i = 0; i < meds.length; i++) {
            for (let j = i + 1; j < meds.length; j++) {
                const interactions = await interactionGraph.checkInteraction(meds[i].medicationName, meds[j].medicationName);
                if (interactions && interactions.length > 0 && interactions[0].severity === 'Major') {
                    links.push({
                        source: meds[i].id,
                        target: meds[j].id,
                        value: 2 // Major severity
                    });
                }
            }
        }

        const width = window.innerWidth;
        const height = window.innerHeight;

        this.svg = d3.select(container).append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height])
            .attr("style", "max-width: 100%; height: auto;");

        // Glowing red filter for danger edges
        const defs = this.svg.append("defs");
        const filter = defs.append("filter")
            .attr("id", "glow")
            .attr("x", "-20%")
            .attr("y", "-20%")
            .attr("width", "140%")
            .attr("height", "140%");
        filter.append("feGaussianBlur")
            .attr("stdDeviation", "3")
            .attr("result", "blur");
        filter.append("feMerge")
            .selectAll("feMergeNode")
            .data(["blur", "SourceGraphic"])
            .enter().append("feMergeNode")
            .attr("in", d => d);

        this.simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(150))
            .force("charge", d3.forceManyBody().strength(-400))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const link = this.svg.append("g")
            .attr("stroke", "#ef4444")
            .attr("stroke-opacity", 0.8)
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke-width", d => Math.sqrt(d.value) * 2)
            .attr("filter", "url(#glow)");

        const node = this.svg.append("g")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .selectAll("circle")
            .data(nodes)
            .join("circle")
            .attr("r", 20)
            .attr("fill", d => links.some(l => l.source.id === d.id || l.target.id === d.id) ? "#ef4444" : "#10b981")
            .call(this.drag(this.simulation));

        const labels = this.svg.append("g")
            .attr("class", "labels")
            .selectAll("text")
            .data(nodes)
            .enter().append("text")
            .attr("dy", -30)
            .attr("text-anchor", "middle")
            .attr("fill", "var(--text-primary)")
            .text(d => d.name)
            .style("font-size", "12px")
            .style("font-weight", "600")
            .style("pointer-events", "none");

        this.simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("cx", d => d.x = Math.max(20, Math.min(width - 20, d.x)))
                .attr("cy", d => d.y = Math.max(20, Math.min(height - 20, d.y)));
                
            labels
                .attr("x", d => d.x)
                .attr("y", d => d.y);
        });
    }

    drag(simulation) {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }
    
    destroy() {
        if (this.simulation) {
            this.simulation.stop();
        }
    }
}
