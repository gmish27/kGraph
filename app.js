$(document).ready(function() {
    const graphContainer = document.getElementById('graph');
    let network;

    // Check for stored API key
    let apiKey = sessionStorage.getItem('apiKey');
    if (apiKey) {
        $('#apiKeyField').hide();
    }

    $('#searchButton').click(function() {
        if (!apiKey) {
            apiKey = $('#apiKey').val().trim();
            if (apiKey) {
                sessionStorage.setItem('apiKey', apiKey);
                $('#apiKeyField').hide();
            }
        }
        const searchPhrase = $('#searchPhrase').val().trim();
        const searchLimit = $('#searchLimit').val().trim() || 10;

        if (!apiKey || !searchPhrase) {
            showError('Please enter both API Key and Search Phrase.');
            return;
        }

        searchKnowledgeGraph(apiKey, searchPhrase, searchLimit);
    });

    function searchKnowledgeGraph(apiKey, query, count) {
        const url = `https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(query)}&key=${apiKey}&limit=${encodeURIComponent(count)}&indent=True`;

        $.ajax({
            url: url,
            dataType: 'json',
            success: function(data) {
                if (data.itemListElement && data.itemListElement.length > 0) {
                    createGraph(query, data.itemListElement);
                } else {
                    showError('No results found for the given query.');
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                showError('Error fetching data: ' + errorThrown);
            }
        });
    }

    function createGraph(centralNode, items) {
        const nodes = new vis.DataSet([
            { id: 0, label: centralNode, color: '#FFA500', value: 20 }
        ]);

        const edges = new vis.DataSet();

        items.forEach((item, index) => {
            const resultScore = item.resultScore || 0;
            const name = item.result.name || 'Unknown';
            const type = item.result['@type'] ? item.result['@type'][0] : 'Unknown';
            const detailedDescription = item.result.detailedDescription || {};
            
            nodes.add({
                id: index + 1,
                label: name,
                color: '#ADD8E6',
                value: Math.max(1, resultScore / 100), // Adjust node size based on result score
                details: {
                    type: type,
                    url: detailedDescription.url || 'N/A',
                    articleBody: detailedDescription.articleBody || 'No description available'
                }
            });

            edges.add({
                from: 0,
                to: index + 1,
                label: type,
                // length: Math.max(10, 100 - Math.pow(resultScore, 0.5)) * 10
            });
        });

        const data = { nodes, edges };
        const options = {
            nodes: {
                shape: 'circle',
                scaling: {
                    min: 10,
                    max: 30,
                    label: {
                        enabled: true,
                        min: 14,
                        max: 30,
                        maxVisible: 30,
                        drawThreshold: 5
                    }
                },
                font: {
                    size: 12,
                    face: 'Tahoma'
                }
            },
            edges: {
                font: {
                    size: 12,
                    align: 'middle'
                },
                color: {
                    color: '#848484',
                    highlight: '#848484',
                    hover: '#848484'
                }
            },
            physics: {
                stabilization: true,
                barnesHut: {
                    gravitationalConstant: -80000,
                    centralGravity: 0.3,
                    springLength: 95,
                    springConstant: 0.04,
                    damping: 0.09,
                    avoidOverlap: 0.1
                }
            },
            interaction: {
                dragNodes: true,
                dragView: true,
                zoomView: true,
                hover: true
            }
        };

        network = new vis.Network(graphContainer, data, options);

        // Add hover event
        network.on("hoverNode", function (params) {
            const node = nodes.get(params.node);
            showNodeDetails(node, params.event.pageX, params.event.pageY);
        });

        network.on("blurNode", function (params) {
            hideNodeDetails();
        });

        // Resize the network when the window size changes
        window.addEventListener('resize', function() {
            network.fit();
        });
    }

    function showNodeDetails(node, x, y) {
        const details = node.details;
        if (details) {
            const content = `
                <h3 class="title is-5">${node.label}</h3>
                <p><strong>Type:</strong> ${details.type}</p>
                <p><strong>URL:</strong> <a href="${details.url}" target="_blank">${details.url}</a></p>
                <p><strong>Description:</strong> ${details.articleBody}</p>
            `;
            $('#nodeDetails').html(content).css({top: y + 10, left: x + 10}).show();
        }
    }

    function hideNodeDetails() {
        $('#nodeDetails').hide();
    }

    function showError(message) {
        $('#error').text(message).show();
        setTimeout(() => $('#error').hide(), 5000);
    }
});