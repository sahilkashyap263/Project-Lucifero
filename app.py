from flask import Flask, render_template, request, jsonify

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/analyze/audio", methods=["POST"])
def analyze_audio():
    # TODO: Wire to core.inference.run_pipeline(mode='audio', audio=...)
    return jsonify({
        "species": "Indian Sparrow",
        "type": "BIRD",
        "confidence": 0.87,
        "distance": 18.4
    })


@app.route("/analyze/image", methods=["POST"])
def analyze_image():
    # TODO: Wire to core.inference.run_pipeline(mode='image', image=...)
    return jsonify({
        "species": "Common Myna",
        "type": "BIRD",
        "confidence": 0.91,
        "distance": 22.0
    })


@app.route("/analyze/fusion", methods=["POST"])
def analyze_fusion():
    # TODO: Wire to core.inference.run_pipeline(mode='fusion', audio=..., image=...)
    return jsonify({
        "species": "Indian Peacock",
        "type": "BIRD",
        "confidence": 0.95,
        "distance": 35.6
    })


if __name__ == "__main__":
    app.run(debug=True)