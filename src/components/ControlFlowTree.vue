<template>
    <div class="control-flow-tree">
      <svg ref="svg" :width="width" :height="height"></svg>
    </div>
  </template>
  
  <script>
  import { ref, onMounted, watch } from 'vue';
  import * as d3 from 'd3';
  
  export default {
    props: {
      data: {
        type: Object,
        required: true
      }
    },
    setup(props) {
      const svg = ref(null);
      const width = ref(1000);
      const height = ref(800);
  
      const drawGraph = () => {
        const { nodes, links } = props.data;
  
        // Clear existing SVG content
        d3.select(svg.value).selectAll("*").remove();
  
        const simulation = d3.forceSimulation(nodes)
          .force("link", d3.forceLink(links).id(d => d.id).distance(100))
          .force("charge", d3.forceManyBody().strength(-300))
          .force("center", d3.forceCenter(width.value / 2, height.value / 2));
  
        const link = d3.select(svg.value).append("g")
          .selectAll("line")
          .data(links)
          .join("line")
          .attr("stroke", "#999")
          .attr("stroke-opacity", 0.6)
          .attr("stroke-width", d => Math.sqrt(d.value));
  
        const node = d3.select(svg.value).append("g")
          .selectAll("g")
          .data(nodes)
          .join("g")
          .call(drag(simulation));
  
        node.append("circle")
          .attr("r", 5)
          .attr("fill", d => d.file ? colorScale(d.file) : "#666");
  
        node.append("text")
          .attr("x", 8)
          .attr("y", "0.31em")
          .text(d => d.name)
          .clone(true).lower()
          .attr("fill", "none")
          .attr("stroke", "white")
          .attr("stroke-width", 3);
  
        simulation.on("tick", () => {
          link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
  
          node
            .attr("transform", d => `translate(${d.x},${d.y})`);
        });
  
        // Add zoom behavior
        const zoom = d3.zoom()
          .scaleExtent([0.1, 4])
          .on("zoom", (event) => {
            d3.select(svg.value).selectAll("g").attr("transform", event.transform);
          });
  
        d3.select(svg.value).call(zoom);
      };
  
      const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
  
      function drag(simulation) {
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
  
      onMounted(() => {
        drawGraph();
      });
  
      watch(() => props.data, () => {
        drawGraph();
      }, { deep: true });
  
      return {
        svg,
        width,
        height
      };
    }
  };
  </script>
  
  <style scoped>
  .control-flow-tree {
    width: 100%;
    height: 800px;
    overflow: hidden;
  }
  
  :deep(svg) {
    width: 100%;
    height: 100%;
  }
  
  :deep(.node text) {
    font: 10px sans-serif;
  }
  </style>