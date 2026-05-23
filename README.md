# ProgressGAN-CXR

**Temporally Conditioned Generative Adversarial Networks for Disease Progression Simulation in COVID-19 Chest X-Rays**

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://python.org)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.10-red.svg)](https://pytorch.org)
[![Dataset](https://img.shields.io/badge/Dataset-COVID--19%20Radiography-green.svg)](https://www.kaggle.com/datasets/tawsifurrahman/covid19-radiography-database)
[![Platform](https://img.shields.io/badge/Platform-Kaggle%20T4x2-orange.svg)](https://kaggle.com)

---

## Overview

Most medical image generation work treats each chest X-ray as an isolated static output. This project introduces **continuous severity conditioning** into GAN-based synthesis, enabling a single trained generator to simulate disease progression along a trajectory from Normal (severity 0.0) to COVID-19 (severity 1.0).

Given the same noise vector, the generator produces a series of chest X-rays that change consistently as severity increases. This is not class-conditional generation with discrete jumps. It is continuous trajectory modeling: the generator learns what a patient's lungs look like at any point along the disease progression spectrum.

Four GAN architectures are trained, evaluated, and compared under a novel three-metric framework. The central finding is that **FID alone is insufficient for evaluating severity-conditioned medical GANs**, and that **knowledge distillation from a semantically strong teacher resolves the quality-semantics tradeoff** observed across baseline architectures.

---

## The Problem with Standard GAN Evaluation

FID (Frechet Inception Distance) measures the distance between the distribution of generated images and real images using features from InceptionV3 pretrained on ImageNet. It is the standard metric for GAN evaluation.

For severity-conditioned medical image synthesis, FID has a critical blind spot: it measures visual realism but not semantic fidelity. A model can achieve low FID while encoding almost no information about disease severity. These two properties are orthogonal.

This becomes clear when comparing DCGAN and WGAN-GP: DCGAN achieves better FID (142.14 vs 237.39) but WGAN-GP encodes severity more consistently in feature space (Spearman r 0.748 vs 0.598). Standard evaluation would incorrectly conclude that DCGAN is the better model for severity-conditioned synthesis.

---

## Proposed Evaluation Framework

We propose three metrics as a minimum suite for evaluating severity-conditioned medical image synthesis:

| Metric | What it Measures | Implementation |
|--------|-----------------|----------------|
| FID | Visual quality, distributional similarity to real images | InceptionV3 features, standard pytorch-fid |
| Spearman r | Semantic severity encoding strength in clinical feature space | ResNet18 fine-tuned on CXR classification, rank correlation of feature distances |
| SSIM | Temporal smoothness of progression between consecutive severity steps | Structural similarity across 11 severity levels per noise vector |

**Why ResNet18 and not InceptionV3 for Spearman r:**

InceptionV3 was trained on natural images and organizes its feature space around visual concepts like textures and object categories. It has no concept of disease severity in chest X-rays. Our ResNet18 classifier was trained to discriminate between Normal, Lung Opacity, Viral Pneumonia, and COVID-19, so its feature space is organized around clinically relevant differences. Measuring feature distances in this space reveals whether generated images encode medically meaningful severity information. This is why FID and Spearman r can disagree: they measure fundamentally different properties.

---

## Dataset

**COVID-19 Radiography Database**
Rahman, T., Khandakar, A., Qiblawey, Y., et al. Qatar University and University of Dhaka, 2021.

| Class | Images | Assigned Severity Score | Clinical Rationale |
|-------|--------|------------------------|--------------------|
| Normal | 10,192 | 0.0 | Healthy lungs, no infection |
| Lung Opacity | 6,012 | 0.33 | Non-COVID lung infection |
| Viral Pneumonia | 1,345 | 0.66 | Viral lung involvement |
| COVID-19 | 3,616 | 1.0 | Severe bilateral infiltrates |
| **Total** | **21,165** | | |

Images: PNG format, 299x299 pixels, grayscale. All images resized to 128x128 for training. Severity scores follow the clinical disease progression order and are treated as a continuous conditioning variable rather than discrete class labels.

---

## Model Architectures

### Severity Conditioning Mechanism (Shared)

All generators receive a 101-dimensional input: a 100-dimensional noise vector concatenated with a scalar severity score. All discriminators and critics receive a 2-channel input: the image concatenated with the severity score broadcast to a full 128x128 spatial channel.

### Generator Architecture (Shared across all four models)

```
Input: [z (100-dim) | severity (1-dim)] = 101-dim
Linear(101) -> 1024 x 4 x 4
ConvTranspose2d: 4x4   -> 8x8    (1024->512,  BatchNorm, ReLU)
ConvTranspose2d: 8x8   -> 16x16  (512->256,   BatchNorm, ReLU)
ConvTranspose2d: 16x16 -> 32x32  (256->128,   BatchNorm, ReLU)
ConvTranspose2d: 32x32 -> 64x64  (128->64,    BatchNorm, ReLU)
ConvTranspose2d: 64x64 -> 128x128 (64->1,     Tanh)
Output: 128x128 grayscale chest X-ray
```

### Model 1: DCGAN

Standard DCGAN (Radford et al., 2015) with severity conditioning. Discriminator uses BatchNorm and BCEWithLogitsLoss. Training on 2x Tesla T4 with mixed precision.

### Model 2: WGAN-GP

Wasserstein GAN with Gradient Penalty (Gulrajani et al., 2017). Discriminator replaced by Critic with InstanceNorm instead of BatchNorm. No Sigmoid at output. Gradient penalty weight lambda=20, n_critic=2.

Required single GPU training. Gradient penalty computes higher-order gradients incompatible with both float16 mixed precision and DataParallel's internal graph sharing. This is documented for reproducibility.

### Model 3: Spectral DCGAN

DCGAN with Spectral Normalization (Miyato et al., 2018) applied to all discriminator convolutional layers via `nn.utils.spectral_norm`. Spectral norm constrains the Lipschitz constant of the discriminator by normalizing weight matrices to unit spectral norm. BatchNorm removed from discriminator since spectral norm provides sufficient regularization. Training on 2x Tesla T4 with mixed precision.

### Model 4: KD Generator (Knowledge Distillation)

Student generator trained with two simultaneous loss signals:

```
L_total = (1 - alpha) * L_adversarial + alpha * L_KD
L_KD    = MSE(student_output, teacher_output)
alpha   = 0.3
```

The frozen WGAN-GP generator serves as teacher. For each training batch, the same noise vector and severity score are passed through both teacher and student. The pixel-level MSE loss transfers the teacher's severity encoding to the student without sacrificing the student's visual quality from adversarial training. Spectral discriminator used for student adversarial training.

---

## Training Configuration

| Parameter | DCGAN | WGAN-GP | Spectral DCGAN | KD Generator |
|-----------|-------|---------|----------------|--------------|
| Epochs | 50 | 50 | 50 | 50 |
| Batch size | 32 | 32 | 32 | 32 |
| LR Generator | 0.0002 | 0.0001 | 0.0002 | 0.0002 |
| LR Discriminator | 0.0002 | 0.0001 | 0.0002 | 0.0002 |
| Optimizer betas | (0.5, 0.999) | (0.0, 0.9) | (0.5, 0.999) | (0.5, 0.999) |
| n_critic | 1 | 2 | 1 | 1 |
| Lambda GP | N/A | 20 | N/A | N/A |
| KD weight | N/A | N/A | N/A | 0.3 |
| Mixed precision | Yes | No | Yes | Yes |
| Hardware | 2x T4 | 1x T4 | 2x T4 | 2x T4 |

---

## Results

### Four-Model Comparison

| Model | FID | Spearman r | SSIM |
|-------|-----|-----------|------|
| DCGAN | **142.14** | 0.598 | 0.905 |
| WGAN-GP | 237.39 | 0.748 | 0.913 |
| Spectral DCGAN | 156.22 | 0.996 | 0.947 |
| KD Generator | 143.17 | **0.984** | **0.963** |

### Finding 1: FID and Spearman r Are Orthogonal

DCGAN achieves the best FID (142.14) but the weakest severity encoding (Spearman r 0.598). WGAN-GP achieves stronger severity encoding (0.748) at the cost of FID (237.39). No single baseline model dominates on both metrics simultaneously. This confirms that visual quality and semantic conditioning are orthogonal properties requiring separate measurement.

### Finding 2: Spectral Normalization Dramatically Improves Severity Encoding

Adding spectral normalization to the discriminator improved Spearman r from 0.598 to 0.996, a 67% improvement, while maintaining competitive FID (156.22 vs 142.14). This suggests that discriminator stability directly impacts how well severity information propagates into the generator's learned representation during training.

### Finding 3: KD Resolves the Quality-Semantics Tradeoff

The KD Generator achieves near-identical FID to DCGAN (143.17 vs 142.14, less than 1% difference) while improving Spearman r from 0.598 to 0.984 (65% improvement) and SSIM from 0.905 to 0.963. Knowledge distillation from WGAN-GP successfully transfers semantic conditioning quality to the student without sacrificing visual fidelity. The KD Generator is the best overall model across the three-metric suite.

### Downstream Classification

ResNet18 classifier trained under three augmentation conditions:

| Training Data | Test Accuracy | Viral Pneumonia Recall |
|--------------|--------------|----------------------|
| Real only | 95.28% | 0.99 |
| Real + WGAN-GP synthetic | 95.25% | 0.97 |
| Real + DCGAN synthetic | **95.34%** | **1.00** |

DCGAN augmentation achieved perfect recall on Viral Pneumonia, the rarest class (1,345 training images, 208 test cases). Zero false negatives. For rare disease detection in imbalanced datasets, targeted GAN augmentation eliminates misses entirely even when overall accuracy improvement is marginal.

---

## Research Contributions

**1. Continuous Severity Conditioning**

Prior GAN-based medical image synthesis generates class-conditional outputs with discrete class labels. This work treats disease severity as a continuous scalar conditioning variable, enabling smooth interpolation between disease states and trajectory simulation within a single model.

**2. Three-Metric Evaluation Framework**

We demonstrate that FID and Spearman r disagree substantially across architectures, establishing that these metrics capture orthogonal properties. We propose FID, Spearman r (using a task-specific feature extractor), and SSIM as a minimum three-metric evaluation suite for severity-conditioned medical image synthesis.

**3. Spectral Normalization Improves Semantic Conditioning**

Spectral normalization in the discriminator improved severity disentanglement from Spearman r 0.598 to 0.996 with moderate FID cost. This connects discriminator stability to semantic conditioning quality in an unexplored direction for medical image synthesis.

**4. Knowledge Distillation Resolves the Quality-Semantics Tradeoff**

KD from a semantically strong teacher achieves best-of-both-worlds: FID 143.17 (matched to DCGAN at 142.14) and Spearman r 0.984 (close to Spectral DCGAN at 0.996). This establishes KD as a principled approach for transferring semantic conditioning without quality loss in medical GAN training.

**5. Rare Class Augmentation**

Targeted DCGAN augmentation for the rarest class (Viral Pneumonia, 6.4% of training data) achieved perfect recall (1.00) on the test set, eliminating all false negatives. This supports class-targeted rather than uniform synthetic augmentation strategies.

---

## References

Goodfellow, I., et al. Generative Adversarial Networks. NeurIPS 2014.

Radford, A., Metz, L., Chintala, S. Unsupervised Representation Learning with Deep Convolutional Generative Adversarial Networks. ICLR 2016.

Gulrajani, I., et al. Improved Training of Wasserstein GANs. NeurIPS 2017.

Miyato, T., et al. Spectral Normalization for Generative Adversarial Networks. ICLR 2018.

Hinton, G., Vinyals, O., Dean, J. Distilling the Knowledge in a Neural Network. NeurIPS Workshop 2015.

Heusel, M., et al. GANs Trained by a Two Time-Scale Update Rule Converge to a Local Nash Equilibrium. NeurIPS 2017. (FID metric)

Rahman, T., et al. Exploring the Effect of Image Enhancement Techniques on COVID-19 Detection using Chest X-ray Images. Computers in Biology and Medicine 2021.

---

## Reproducibility

Full implementation available as a Kaggle notebook. Trained on the COVID-19 Radiography Database (publicly available on Kaggle). All experiments run on Kaggle dual Tesla T4 GPU environment except WGAN-GP which required single GPU due to gradient penalty constraints.

Known issues documented: WGAN-GP gradient penalty incompatibility with mixed precision training and DataParallel, critic dominance with large n_critic causing generator loss divergence, DataParallel module prefix in checkpoint state dicts.

---

## Author

**Ali Raza**
BSc Computer Science, FAST-NUCES Faisalabad
AI/ML Engineer

GitHub: [github.com/alyrraza](https://github.com/alyrraza)
Email: mirzaalirazafsd@gmail.com
