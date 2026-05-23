import torch
import torch.nn as nn
import torchvision.models as tv_models


class DCGANGenerator(nn.Module):
    def __init__(self, z_dim=100, img_channels=1):
        super().__init__()
        self.input_dim = z_dim + 1
        self.fc = nn.Sequential(
            nn.Linear(self.input_dim, 1024 * 4 * 4),
            nn.ReLU(True),
        )
        self.conv_blocks = nn.Sequential(
            nn.ConvTranspose2d(1024, 512, 4, 2, 1, bias=False),
            nn.BatchNorm2d(512), nn.ReLU(True),
            nn.ConvTranspose2d(512, 256, 4, 2, 1, bias=False),
            nn.BatchNorm2d(256), nn.ReLU(True),
            nn.ConvTranspose2d(256, 128, 4, 2, 1, bias=False),
            nn.BatchNorm2d(128), nn.ReLU(True),
            nn.ConvTranspose2d(128, 64, 4, 2, 1, bias=False),
            nn.BatchNorm2d(64), nn.ReLU(True),
            nn.ConvTranspose2d(64, img_channels, 4, 2, 1, bias=False),
            nn.Tanh(),
        )

    def forward(self, z, severity):
        x = torch.cat([z, severity], dim=1)
        x = self.fc(x)
        x = x.view(-1, 1024, 4, 4)
        return self.conv_blocks(x)


def build_classifier() -> nn.Module:
    model = tv_models.resnet18(weights=None)
    model.fc = nn.Linear(512, 4)
    return model
