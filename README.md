# NAQSH AI

**Recognising known ancient inscriptions of AlUla from a photograph.**

| Resource | Link |
|---|---|
| Presentation | [View the presentation](PRESENTATION_LINK_HERE) |
| Live demo | [Try NAQSH AI](DEMO_LINK_HERE) |

---

## Overview

AlUla holds thousands of ancient inscriptions carved in rock and stone over more than 2,000 years. Most visitors can see these inscriptions but cannot read them.

NAQSH AI is a computer vision project that identifies a known inscription from a photograph and displays its documented record: its location, script, reading and meaning. When the model is not confident, it returns **"not recognised"** instead of giving a possibly wrong answer.

NAQSH AI recognises inscriptions it has been trained on. It does not read new or unseen text, and it is not an OCR system.

## How It Works

1. The user provides a photograph of an inscription.
2. A deep learning model (MobileNetV2) compares the photograph with the 35 supported inscriptions and gives a confidence score.
3. If the score is above the confidence threshold, the system displays the inscription's documented record.
4. If the score is below the threshold, the system returns "not recognised" and displays no reading.

## Results

The model was evaluated on photographs that were not used during training.

| Measure | Result |
|---|---|
| Correctly identified inscriptions | 26 of 35 (74%) |
| Second evaluation with different test photographs | 28 of 35 (80%) |
| Unknown inscriptions correctly rejected | 23 of 23 |
| Incorrect readings displayed | 0 |
| Random guess (for comparison) | 3% |

The confidence threshold is set high (0.997) to prevent incorrect readings. As a result, the model accepted 10 of the 35 known test photographs, all of them correctly, and rejected the others.

## Dataset

- 181 real photographs taken in AlUla:
  - 135 photographs of the 35 supported inscriptions
  - 46 photographs of other inscriptions, used to test rejection
- Scripts covered: Dadanitic, Nabataean, Minaic, Latin, Nabataeo-Arabic and early Islamic Arabic.
- Sites covered: Dadan, Umm Daraj, Jabal ʿIkmah, Hegra and other locations in AlUla.
- Photograph sources: Wikimedia Commons, Flickr, Livius.org and World History Encyclopedia. All photographs are openly licensed, and their sources and authors are recorded in the metadata.
- Inscription readings are taken from published sources: the OCIANA Dadanitic Corpus (University of Oxford) and the Royal Commission for AlUla catalogue.

## Getting Started

### Option 1: Google Colab (recommended)

No installation is required.

1. Download this repository using **Code → Download ZIP**.
2. Upload the ZIP file to Google Colab, then run:
   ```python
   !unzip -q NAQSH-main.zip
   %cd NAQSH-main
   ```
3. Open `NAQSH.ipynb` and select **Runtime → Run all**.

A GPU is not required.

### Option 2: Local installation

```bash
pip install tensorflow pandas numpy scikit-learn matplotlib pillow jupyter
jupyter notebook NAQSH.ipynb
```

The project was tested with TensorFlow 2.18 and Keras 3.8. A full run takes approximately 30 to 40 minutes on a standard laptop, and less with a GPU.

### Using the trained model

The trained model is included in the repository and can be loaded without retraining:

```python
import keras
model = keras.models.load_model("naqsh_model.keras")
```

## Repository Structure

```
NAQSH/
├── NAQSH.ipynb            Full project: data, analysis, preprocessing, model, evaluation and demo
├── naqsh_model.keras      Trained model
├── dataset/
│   ├── images/            Photographs (part 1)
│   ├── images_added/      Photographs (part 2)
│   ├── images_merged/     Photographs (part 3)
│   └── splits/            Training, validation and test lists
├── metadata/              Photograph details, inscription records and knowledge base
└── docs/
    └── index.html         Project presentation
```

The notebook requires the `metadata/` folder to run.

## Model Summary

- **Transfer learning:** The project uses MobileNetV2, a model already trained on more than one million images, and adds a new final layer that selects among the 35 inscriptions.
- **Two-stage training:** The new layer is trained first. The last 30 layers of the model are then fine-tuned on AlUla photographs.
- **Data augmentation:** Photographs are rotated, zoomed and adjusted for brightness during training. They are not flipped, because writing has a fixed direction.
- **Rejection threshold:** A confidence threshold, selected using separate validation photographs, allows the model to reject inscriptions it does not know.

## Limitations

- Most inscriptions have only one to three training photographs, so results may vary.
- Most errors occur between inscriptions that look very similar.
- The system has not yet been tested with photographs taken by visitors.
- Two photographs use non-commercial licences (CC BY-NC). They are suitable for academic use but not for commercial use.

This project is a proof of concept developed for academic purposes.

## Team

- Ghadi Alshahrani
- Tarfah Alsunaidi
- Razan Al Shami
- Khalid Alotaibi

Data Science and Artificial Intelligence Bootcamp, Tuwaiq Academy.

This project is not affiliated with the Royal Commission for AlUla.
