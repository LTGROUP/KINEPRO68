from html import escape
from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


def get_text(value) -> str:
    if value is None:
        return "-"

    clean_value = str(value).strip()

    if not clean_value:
        return "-"

    return clean_value


def build_field(label: str, value) -> list:
    return [
        Paragraph(f"<b>{label}</b>", ParagraphStyle(name="FieldLabel", fontSize=9, textColor=colors.HexColor("#176b5b"))),
        Paragraph(
            escape(get_text(value)),
            ParagraphStyle(name="FieldValue", fontSize=10, leading=14),
        ),
        Spacer(1, 6),
    ]


def add_section(story: list, title: str, styles) -> None:
    story.append(Spacer(1, 8))
    story.append(Paragraph(title, styles["SectionTitle"]))
    story.append(Spacer(1, 6))


def generate_medical_record_pdf(record: dict, patient: dict | None = None) -> bytes:
    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )

    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="TitleKinePro",
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#176b5b"),
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Subtitle",
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#12241f"),
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SectionTitle",
            fontSize=12,
            leading=15,
            textColor=colors.white,
            backColor=colors.HexColor("#176b5b"),
            borderPadding=6,
            spaceBefore=6,
            spaceAfter=6,
        )
    )

    story = []

    logo_path = Path(__file__).resolve().parents[2] / "assets" / "KinePro.jpg"

    if logo_path.exists():
        story.append(
            Image(
                str(logo_path),
                width=45 * mm,
                height=45 * mm,
            )
    )

    story.append(Paragraph("Historia clínica del paciente", styles["Subtitle"]))

    if patient:
      add_section(story, "Datos del paciente", styles)
      data = [
          ["Nombre y apellido", f"{get_text(patient.get('nombre'))} {get_text(patient.get('apellido'))}"],
          ["DNI", get_text(patient.get("dni"))],
          ["Teléfono", get_text(patient.get("telefono"))],
          ["Email", get_text(patient.get("email"))],
          ["Obra social", get_text(patient.get("obra_social"))],
          ["Fecha de nacimiento", get_text(patient.get("fecha_nacimiento"))],
      ]

      table = Table(data, colWidths=[55 * mm, 100 * mm])
      table.setStyle(
          TableStyle(
              [
                  ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#edf5f2")),
                  ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#176b5b")),
                  ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                  ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                  ("FONTSIZE", (0, 0), (-1, -1), 9),
                  ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d7e3df")),
                  ("VALIGN", (0, 0), (-1, -1), "TOP"),
                  ("LEFTPADDING", (0, 0), (-1, -1), 8),
                  ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                  ("TOPPADDING", (0, 0), (-1, -1), 6),
                  ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
              ]
          )
      )
      story.append(table)

    add_section(story, "Información médica", styles)
    story.extend(build_field("Motivo de consulta", record.get("motivo_consulta")))
    story.extend(build_field("Diagnóstico médico", record.get("diagnostico_medico")))
    story.extend(build_field("Zona afectada", record.get("zona_afectada")))
    story.extend(build_field("Inicio de lesión o dolor", record.get("fecha_inicio_lesion")))

    add_section(story, "Antecedentes", styles)
    story.extend(build_field("Cirugías relevantes", record.get("cirugias_relevantes")))
    story.extend(build_field("Enfermedades relevantes", record.get("enfermedades_relevantes")))
    story.extend(build_field("Medicación actual", record.get("medicacion_actual")))
    story.extend(build_field("Alergias", record.get("alergias")))

    add_section(story, "Información adicional", styles)
    story.extend(build_field("Ocupación", record.get("ocupacion")))
    story.extend(build_field("Actividad física", record.get("actividad_fisica")))

    add_section(story, "Estudios complementarios", styles)
    studies = record.get("estudios", [])

    if not studies:
        story.append(Paragraph("No hay estudios complementarios cargados.", styles["Normal"]))
    else:
        data = [["Tipo", "Fecha", "Observaciones"]]

        for study in studies:
            data.append(
                [
                    get_text(study.get("tipo_estudio")),
                    get_text(study.get("fecha_estudio")),
                    get_text(study.get("observaciones")),
                ]
            )

        table = Table(data, colWidths=[45 * mm, 32 * mm, 78 * mm])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#176b5b")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d7e3df")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.append(table)

    story.append(Spacer(1, 18))
    story.append(Paragraph("Documento generado por KinePro.", styles["Normal"]))

    document.build(story)

    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes
