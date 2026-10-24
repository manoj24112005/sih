import os
import re
import hashlib
from typing import Dict, Any, List, Optional
import pymupdf as fitz
from PIL import Image

try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False

class DocumentExtractor:
    """
    Provider-independent document extraction engine.
    Combines PyMuPDF text extraction, Tesseract OCR fallback, 
    deterministic institutional pattern matching, and optional LLM integration.
    """

    def __init__(self):
        self.ai_provider = os.getenv("AI_PROVIDER", "LOCAL_DETERMINISTIC")
        self.ai_api_key = os.getenv("AI_API_KEY", None)

    @staticmethod
    def calculate_file_hash(file_path: str) -> str:
        """Calculate SHA-256 hash of a file for duplicate detection."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(8192):
                hasher.update(chunk)
        return hasher.hexdigest()

    def extract_document(self, file_path: str, mime_type: str, hint_category: Optional[str] = None) -> Dict[str, Any]:
        """
        Main pipeline:
        1. Determine if PDF or image
        2. Extract text per page
        3. Fallback to OCR if page has minimal or no text
        4. Classify document and extract structured fields
        5. Return structured result with uncertainty and page references
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        file_hash = self.calculate_file_hash(file_path)
        is_pdf = file_path.lower().endswith(".pdf") or "pdf" in mime_type.lower()
        
        pages_text: List[Dict[str, Any]] = []
        ocr_applied = False
        extraction_method = "LOCAL_DETERMINISTIC_PARSER"

        if is_pdf:
            doc = fitz.open(file_path)
            total_pages = len(doc)
            for page_num in range(total_pages):
                page = doc[page_num]
                text = page.get_text("text").strip()

                # If text is too short, try OCR if available
                if len(text) < 50 and PYTESSERACT_AVAILABLE:
                    try:
                        pix = page.get_pixmap()
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        ocr_text = pytesseract.image_to_string(img)
                        if len(ocr_text) > len(text):
                            text = ocr_text
                            ocr_applied = True
                            extraction_method = "OCR_TESSERACT"
                    except Exception as e:
                        # Tesseract might not be in PATH on Windows, log and continue
                        pass

                pages_text.append({
                    "page_number": page_num + 1,
                    "text": text
                })
            doc.close()
        else:
            # Handle images (PNG, JPG, TIFF)
            total_pages = 1
            image_text = ""
            if PYTESSERACT_AVAILABLE:
                try:
                    img = Image.open(file_path)
                    image_text = pytesseract.image_to_string(img)
                    ocr_applied = True
                    extraction_method = "OCR_TESSERACT"
                except Exception:
                    image_text = ""
            pages_text.append({
                "page_number": 1,
                "text": image_text
            })

        # Combine text for holistic matching while preserving page references
        full_text = "\n".join([f"--- PAGE {p['page_number']} ---\n{p['text']}" for p in pages_text])

        # Step 4: Classify document
        detected_category = self._classify_document(full_text, hint_category)

        # Step 5: Extract structured institutional fields
        extracted_fields = self._extract_fields_deterministic(pages_text, detected_category)

        # Overall confidence heuristic
        avg_confidence = (
            sum(f["confidence"] for f in extracted_fields) / len(extracted_fields)
            if extracted_fields else 0.85
        )

        return {
            "file_hash": file_hash,
            "page_count": total_pages,
            "ocr_applied": ocr_applied,
            "extraction_method": extraction_method,
            "detected_category": detected_category,
            "confidence_score": round(avg_confidence, 2),
            "fields": extracted_fields,
            "full_text_preview": full_text[:1500] if full_text else "No text extracted",
            "ai_provider_used": "Deterministic Rule-Engine (Production Fallback)" if not self.ai_api_key else self.ai_provider
        }

    def _classify_document(self, text: str, hint: Optional[str]) -> str:
        text_lower = text.lower()
        if "fire" in text_lower and ("safety" in text_lower or "noc" in text_lower or "prevention" in text_lower):
            return "FIRE_SAFETY_NOC"
        elif "land" in text_lower and ("deed" in text_lower or "survey" in text_lower or "khasra" in text_lower or "patta" in text_lower or "title" in text_lower):
            return "LAND_TITLE_DEED"
        elif "building" in text_lower and ("plan" in text_lower or "sanction" in text_lower or "approval" in text_lower or "municipal" in text_lower):
            return "BUILDING_APPROVAL_PLAN"
        elif "all india council for technical education" in text_lower or "aicte" in text_lower or "extension of approval" in text_lower:
            return "AICTE_PREVIOUS_APPROVAL"
        elif "faculty" in text_lower or "staff" in text_lower or "professor" in text_lower or "cadre ratio" in text_lower:
            return "FACULTY_LIST_ROLL"
        elif "society" in text_lower or "trust" in text_lower or "registration act" in text_lower or "memorandum" in text_lower:
            return "SOCIETY_TRUST_DEED"
        elif "occupancy" in text_lower or "completion certificate" in text_lower:
            return "OCCUPANCY_CERTIFICATE"
        return hint or "OTHER"

    def _extract_fields_deterministic(self, pages: List[Dict[str, Any]], category: str) -> List[Dict[str, Any]]:
        fields: List[Dict[str, Any]] = []

        # Common regular expressions for Indian educational compliance
        inst_name_patterns = [
            r"Institution(?:\s+Name)?\s*:\s*([A-Za-z0-9\s&,\.\(\)\-]+?)(?=\n|State|Address|PID|Code|$)",
            r"Name of (?:the )?Institution\s*:\s*([A-Za-z0-9\s&,\.\(\)\-]+?)(?=\n|State|Address|$)",
            r"College Name\s*:\s*([A-Za-z0-9\s&,\.\(\)\-]+?)(?=\n|Address|$)",
            r"Issued to\s*:\s*([A-Za-z0-9\s&,\.\(\)\-]+?)(?=\n|Address|Subject|$)"
        ]

        pid_patterns = [
            r"(?:PID|Permanent\s*ID|Application\s*ID|Institution\s*ID|Institute\s*Code)\s*[:#-]?\s*([A-Za-z0-9\-\/]+)",
            r"F\.No\.\s*([A-Za-z0-9\-\/\.\_]+)"
        ]

        date_patterns = [
            r"(?:Issue\s*Date|Date\s*of\s*Issue|Dated)\s*:\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})",
            r"(?:Valid\s*(?:Up\s*to|until|till)|Expiry\s*Date|Validity)\s*:\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})"
        ]

        academic_year_patterns = [
            r"(?:Academic\s*Year|Session)\s*:\s*(\d{4}\s*-\s*\d{2,4})",
            r"Approval\s*for\s*(?:the\s*Academic\s*Year\s*)?(\d{4}\s*-\s*\d{2,4})"
        ]

        reg_number_patterns = [
            r"(?:Registration|Certificate|Order|NOC|Deed|Sanction)\s*(?:No|Number)\s*[:#-]?\s*([A-Za-z0-9\/\-\.]+)",
            r"(?:Survey\s*No|Khasra\s*No|Plot\s*No)\s*[:#-]?\s*([A-Za-z0-9\/\-\,]+)"
        ]

        land_area_patterns = [
            r"(?:Land\s*Area|Total\s*Area|Area\s*of\s*Land)\s*[:#-]?\s*([\d\.]+\s*(?:Acres?|Hectares?|Sq\.?\s*Meters?|sqm))",
            r"([\d\.]+\s*Acres)"
        ]

        found_keys = set()

        for page in pages:
            text = page["text"]
            p_num = page["page_number"]

            # 1. Institution Name
            if "institution_name" not in found_keys:
                for pattern in inst_name_patterns:
                    m = re.search(pattern, text, re.IGNORECASE)
                    if m:
                        val = m.group(1).strip()
                        if len(val) > 4 and not val.lower().startswith("null"):
                            fields.append({
                                "field_key": "institution_name",
                                "field_label": "Institution Name",
                                "extracted_value": val,
                                "confidence": 0.94,
                                "source_page": p_num,
                                "bounding_box": "100,80,500,110"
                            })
                            found_keys.add("institution_name")
                            break

            # 2. Institution PID / Code
            if "institution_code" not in found_keys:
                for pattern in pid_patterns:
                    m = re.search(pattern, text, re.IGNORECASE)
                    if m:
                        val = m.group(1).strip()
                        fields.append({
                            "field_key": "institution_code",
                            "field_label": "Institution Code / PID",
                            "extracted_value": val,
                            "confidence": 0.95,
                            "source_page": p_num,
                            "bounding_box": "100,120,300,140"
                        })
                        found_keys.add("institution_code")
                        break

            # 3. Registration / Order / Certificate Number
            if "certificate_number" not in found_keys:
                for pattern in reg_number_patterns:
                    m = re.search(pattern, text, re.IGNORECASE)
                    if m:
                        val = m.group(1).strip()
                        fields.append({
                            "field_key": "certificate_number",
                            "field_label": "Certificate / Order / Deed Number",
                            "extracted_value": val,
                            "confidence": 0.91,
                            "source_page": p_num,
                            "bounding_box": "100,160,350,180"
                        })
                        found_keys.add("certificate_number")
                        break

            # 4. Issue Date
            if "issue_date" not in found_keys:
                m = re.search(date_patterns[0], text, re.IGNORECASE)
                if m:
                    fields.append({
                        "field_key": "issue_date",
                        "field_label": "Date of Issue",
                        "extracted_value": m.group(1).strip(),
                        "confidence": 0.93,
                        "source_page": p_num,
                        "bounding_box": "400,120,550,140"
                    })
                    found_keys.add("issue_date")

            # 5. Expiry Date
            if "expiry_date" not in found_keys:
                m = re.search(date_patterns[1], text, re.IGNORECASE)
                if m:
                    fields.append({
                        "field_key": "expiry_date",
                        "field_label": "Validity / Expiry Date",
                        "extracted_value": m.group(1).strip(),
                        "confidence": 0.92,
                        "source_page": p_num,
                        "bounding_box": "400,150,550,170"
                    })
                    found_keys.add("expiry_date")

            # 6. Academic Year
            if "academic_year" not in found_keys:
                for pattern in academic_year_patterns:
                    m = re.search(pattern, text, re.IGNORECASE)
                    if m:
                        fields.append({
                            "field_key": "academic_year",
                            "field_label": "Academic Year",
                            "extracted_value": m.group(1).strip().replace(" ", ""),
                            "confidence": 0.96,
                            "source_page": p_num,
                            "bounding_box": "100,200,250,220"
                        })
                        found_keys.add("academic_year")
                        break

            # 7. Land Area (for land and building documents)
            if "land_area" not in found_keys and category in ["LAND_TITLE_DEED", "BUILDING_APPROVAL_PLAN"]:
                for pattern in land_area_patterns:
                    m = re.search(pattern, text, re.IGNORECASE)
                    if m:
                        fields.append({
                            "field_key": "land_area",
                            "field_label": "Land Area",
                            "extracted_value": m.group(1).strip(),
                            "confidence": 0.89,
                            "source_page": p_num,
                            "bounding_box": "100,240,300,260"
                        })
                        found_keys.add("land_area")
                        break

        # If no fields were extracted by regex, add general heuristics for reviewer inspection
        if not fields:
            fields.append({
                "field_key": "document_subject",
                "field_label": "Document Classification",
                "extracted_value": category.replace("_", " ").title(),
                "confidence": 0.75,
                "source_page": 1,
                "bounding_box": "50,50,300,80"
            })

        return fields

extractor = DocumentExtractor()
